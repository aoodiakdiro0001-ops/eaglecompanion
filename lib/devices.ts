import type { AgentPairInput } from "@/lib/validation";
import type { Device, DeviceView, Role } from "@/types";
import { getDb } from "./db";
import { audit } from "./audit";
import { hashDeviceToken, randomToken } from "./crypto";
import { newId, now } from "./ids";
import { hashPairingCode, newPairingCode, normalizeCode } from "./tokens";
import { clearFrame } from "./frames";

export const PAIRING_TTL_MS = 10 * 60 * 1000;
export const ONLINE_WINDOW_MS = 45 * 1000;

const PUBLIC_DEVICE_COLUMNS = `d.id, d.workspace_id, d.name, d.platform, d.model,
  d.battery_level, d.battery_charging, d.network_type, d.screen_w, d.screen_h,
  d.user_agent, d.paired_at, d.last_seen_at, d.revoked_at`;

export class PairingError extends Error {}

export function canManageDevices(role: Role | undefined): boolean {
  return role === "owner" || role === "member";
}

export function isOnline(device: Device, nowMs = Date.now()): boolean {
  return (
    device.revoked_at === null &&
    device.last_seen_at !== null &&
    nowMs - device.last_seen_at <= ONLINE_WINDOW_MS
  );
}

export function createPairingCode(
  workspaceId: string,
  userId: string,
): { code: string; expiresAt: number } {
  const code = newPairingCode();
  const createdAt = now();
  const expiresAt = createdAt + PAIRING_TTL_MS;
  getDb()
    .prepare(
      `INSERT INTO pairing_codes (id, workspace_id, code_hash, created_by, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(newId("pair"), workspaceId, hashPairingCode(code), userId, expiresAt, createdAt);
  return { code, expiresAt };
}

export function consumePairingCode(
  input: AgentPairInput,
  ip?: string,
): { device: Device; token: string } {
  const db = getDb();
  const codeHash = hashPairingCode(normalizeCode(input.code));
  const timestamp = now();

  return db.transaction(() => {
    const row = db
      .prepare(
        `SELECT * FROM pairing_codes
         WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?`,
      )
      .get(codeHash, timestamp) as
      | { id: string; workspace_id: string; created_by: string }
      | undefined;

    if (!row) throw new PairingError("كود الاقتران غير صالح أو منتهي");

    db.prepare("UPDATE pairing_codes SET used_at = ? WHERE id = ?").run(
      timestamp,
      row.id,
    );

    const deviceId = newId("dev");
    const token = randomToken(32);
    db.prepare(
      `INSERT INTO devices
       (id, workspace_id, name, platform, model, token_hash, screen_w, screen_h,
        user_agent, paired_at, last_seen_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    ).run(
      deviceId,
      row.workspace_id,
      input.name.trim(),
      input.platform ?? null,
      hashDeviceToken(token),
      input.screenW ?? null,
      input.screenH ?? null,
      input.userAgent ?? null,
      timestamp,
      timestamp,
    );

    audit({
      workspaceId: row.workspace_id,
      action: "device.pair",
      actorUserId: row.created_by,
      deviceId,
      metadata: { name: input.name.trim() },
      ip: ip ?? null,
    });

    const device = db
      .prepare(`SELECT ${PUBLIC_DEVICE_COLUMNS} FROM devices d WHERE d.id = ?`)
      .get(deviceId) as Device;
    return { device, token };
  })();
}

export function getDevice(deviceId: string): Device | null {
  const row = getDb()
    .prepare(`SELECT ${PUBLIC_DEVICE_COLUMNS} FROM devices d WHERE d.id = ?`)
    .get(deviceId) as Device | undefined;
  return row ?? null;
}

export function getDeviceForUser(
  userId: string,
  deviceId: string,
): { device: Device; role: Role } | null {
  const row = getDb()
    .prepare(
      `SELECT ${PUBLIC_DEVICE_COLUMNS}, m.role
       FROM devices d
       JOIN workspace_members m ON m.workspace_id = d.workspace_id
       WHERE d.id = ? AND m.user_id = ?`,
    )
    .get(deviceId, userId) as (Device & { role: Role }) | undefined;
  if (!row) return null;
  const { role, ...device } = row;
  return { device: device as Device, role };
}

export function deviceByToken(token: string): Device | null {
  const row = getDb()
    .prepare(
      `SELECT ${PUBLIC_DEVICE_COLUMNS} FROM devices d
       WHERE d.token_hash = ? AND d.revoked_at IS NULL`,
    )
    .get(hashDeviceToken(token)) as Device | undefined;
  return row ?? null;
}

export function listDevices(workspaceId: string, nowMs = Date.now()): DeviceView[] {
  const freshThreshold = nowMs - 5_000;
  const rows = getDb()
    .prepare(
      `SELECT ${PUBLIC_DEVICE_COLUMNS},
         EXISTS(
           SELECT 1 FROM share_sessions s
           WHERE s.device_id = d.id AND s.ended_at IS NULL
             AND s.expires_at > ? AND s.last_frame_at > ?
         ) AS sharing
       FROM devices d
       WHERE d.workspace_id = ? AND d.revoked_at IS NULL
       ORDER BY COALESCE(d.last_seen_at, d.paired_at) DESC`,
    )
    .all(nowMs, freshThreshold, workspaceId) as Array<Device & { sharing: number }>;

  return rows.map(({ sharing, ...device }) => ({
    ...device,
    online: isOnline(device, nowMs),
    sharing: sharing === 1,
  }));
}

export function revokeDevice(
  workspaceId: string,
  deviceId: string,
  actorUserId: string,
  role: Role,
  ip?: string,
): boolean {
  if (!canManageDevices(role)) return false;
  const db = getDb();
  const timestamp = now();
  const result = db
    .prepare(
      "UPDATE devices SET revoked_at = ? WHERE id = ? AND workspace_id = ? AND revoked_at IS NULL",
    )
    .run(timestamp, deviceId, workspaceId);
  if (result.changes === 0) return false;

  db.prepare(
    "UPDATE share_sessions SET ended_at = ? WHERE device_id = ? AND ended_at IS NULL",
  ).run(timestamp, deviceId);
  clearFrame(deviceId);
  audit({
    workspaceId,
    action: "device.revoke",
    actorUserId,
    deviceId,
    ip: ip ?? null,
  });
  return true;
}

export interface HeartbeatPatch {
  batteryLevel?: number | null;
  charging?: boolean | null;
  networkType?: string | null;
  platform?: string;
  model?: string;
  screenW?: number;
  screenH?: number;
}

export function touchDevice(deviceId: string, patch: HeartbeatPatch): Device | null {
  const assignments: string[] = ["last_seen_at = ?"];
  const values: Array<string | number | null> = [now()];

  const push = (column: string, value: string | number | null | undefined) => {
    if (value === undefined) return;
    assignments.push(`${column} = ?`);
    values.push(value);
  };

  push("battery_level", patch.batteryLevel);
  if (patch.charging !== undefined) {
    push(
      "battery_charging",
      patch.charging === null ? null : patch.charging ? 1 : 0,
    );
  }
  push("network_type", patch.networkType);
  push("platform", patch.platform);
  push("model", patch.model);
  push("screen_w", patch.screenW);
  push("screen_h", patch.screenH);

  values.push(deviceId);
  getDb()
    .prepare(`UPDATE devices SET ${assignments.join(", ")} WHERE id = ?`)
    .run(...values);
  return getDevice(deviceId);
}

export function toDeviceView(device: Device, nowMs = Date.now()): DeviceView {
  return { ...device, online: isOnline(device, nowMs), sharing: false };
}
