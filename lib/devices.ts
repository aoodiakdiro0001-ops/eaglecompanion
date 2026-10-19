import type { AgentPairInput } from "@/lib/validation";
import type { Device, DeviceView, Role } from "@/types";
import { q, qGet, qRun } from "./db";
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

export async function createPairingCode(
  workspaceId: string,
  userId: string,
): Promise<{ code: string; expiresAt: number }> {
  const code = newPairingCode();
  const createdAt = now();
  const expiresAt = createdAt + PAIRING_TTL_MS;
  await qRun(
    `INSERT INTO pairing_codes (id, workspace_id, code_hash, created_by, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newId("pair"),
    workspaceId,
    hashPairingCode(code),
    userId,
    expiresAt,
    createdAt,
  );
  return { code, expiresAt };
}

export async function consumePairingCode(
  input: AgentPairInput,
  ip?: string,
): Promise<{ device: Device; token: string }> {
  const codeHash = hashPairingCode(normalizeCode(input.code));
  const timestamp = now();

  // Atomic claim prevents two devices from consuming the same code concurrently.
  const claimed = await qRun(
    "UPDATE pairing_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?",
    timestamp,
    codeHash,
    timestamp,
  );
  if (claimed.changes === 0) throw new PairingError("كود الاقتران غير صالح أو منتهي");

  const row = await qGet<{ id: string; workspace_id: string; created_by: string }>(
    "SELECT id, workspace_id, created_by FROM pairing_codes WHERE code_hash = ?",
    codeHash,
  );
  if (!row) throw new PairingError("كود الاقتران غير صالح أو منتهي");

  const deviceId = newId("dev");
  const token = randomToken(32);
  await qRun(
    `INSERT INTO devices
     (id, workspace_id, name, platform, model, token_hash, screen_w, screen_h,
      user_agent, paired_at, last_seen_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
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

  await audit({
    workspaceId: row.workspace_id,
    action: "device.pair",
    actorUserId: row.created_by,
    deviceId,
    metadata: { name: input.name.trim() },
    ip: ip ?? null,
  });

  const device = await qGet<Device>(
    `SELECT ${PUBLIC_DEVICE_COLUMNS} FROM devices d WHERE d.id = ?`,
    deviceId,
  );
  if (!device) throw new PairingError("تعذر إنشاء الجهاز");
  return { device, token };
}

export async function getDevice(deviceId: string): Promise<Device | null> {
  const row = await qGet<Device>(
    `SELECT ${PUBLIC_DEVICE_COLUMNS} FROM devices d WHERE d.id = ?`,
    deviceId,
  );
  return row ?? null;
}

export async function getDeviceForUser(
  userId: string,
  deviceId: string,
): Promise<{ device: Device; role: Role } | null> {
  const row = await qGet<Device & { role: Role }>(
    `SELECT ${PUBLIC_DEVICE_COLUMNS}, m.role
     FROM devices d
     JOIN workspace_members m ON m.workspace_id = d.workspace_id
     WHERE d.id = ? AND m.user_id = ?`,
    deviceId,
    userId,
  );
  if (!row) return null;
  const { role, ...device } = row;
  return { device: device as Device, role };
}

export async function deviceByToken(token: string): Promise<Device | null> {
  const row = await qGet<Device>(
    `SELECT ${PUBLIC_DEVICE_COLUMNS} FROM devices d
     WHERE d.token_hash = ? AND d.revoked_at IS NULL`,
    hashDeviceToken(token),
  );
  return row ?? null;
}

export async function listDevices(workspaceId: string, nowMs = Date.now()): Promise<DeviceView[]> {
  const freshThreshold = nowMs - 5_000;
  const rows = await q<Device & { sharing: number }>(
    `SELECT ${PUBLIC_DEVICE_COLUMNS},
       EXISTS(
         SELECT 1 FROM share_sessions s
         WHERE s.device_id = d.id AND s.ended_at IS NULL
           AND s.expires_at > ? AND s.last_frame_at > ?
       ) AS sharing
     FROM devices d
     WHERE d.workspace_id = ? AND d.revoked_at IS NULL
     ORDER BY COALESCE(d.last_seen_at, d.paired_at) DESC`,
    nowMs,
    freshThreshold,
    workspaceId,
  );

  return rows.map(({ sharing, ...device }) => ({
    ...device,
    online: isOnline(device, nowMs),
    sharing: sharing === 1,
  }));
}

export async function revokeDevice(
  workspaceId: string,
  deviceId: string,
  actorUserId: string,
  role: Role,
  ip?: string,
): Promise<boolean> {
  if (!canManageDevices(role)) return false;
  const timestamp = now();
  const result = await qRun(
    "UPDATE devices SET revoked_at = ? WHERE id = ? AND workspace_id = ? AND revoked_at IS NULL",
    timestamp,
    deviceId,
    workspaceId,
  );
  if (result.changes === 0) return false;

  await qRun(
    "UPDATE share_sessions SET ended_at = ? WHERE device_id = ? AND ended_at IS NULL",
    timestamp,
    deviceId,
  );
  clearFrame(deviceId);
  await audit({
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

export async function touchDevice(deviceId: string, patch: HeartbeatPatch): Promise<Device | null> {
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
  await qRun(`UPDATE devices SET ${assignments.join(", ")} WHERE id = ?`, ...values);
  return getDevice(deviceId);
}

export function toDeviceView(device: Device, nowMs = Date.now()): DeviceView {
  return { ...device, online: isOnline(device, nowMs), sharing: false };
}
