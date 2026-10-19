import type { ShareSession } from "@/types";
import { qGet, qRun, qTxn } from "./db";
import { clearFrame } from "./frames";
import { newId, now } from "./ids";

export const SHARE_TTL_MS = 10 * 60 * 1000;
export const FRAME_FRESH_MS = 5 * 1000;

export async function startShare(deviceId: string, nowMs = Date.now()): Promise<ShareSession> {
  const id = newId("shr");
  const expiresAt = nowMs + SHARE_TTL_MS;
  await qTxn([
    {
      sql: "UPDATE share_sessions SET ended_at = ? WHERE device_id = ? AND ended_at IS NULL",
      args: [nowMs, deviceId],
    },
    {
      sql: `INSERT INTO share_sessions (id, device_id, started_at, expires_at, frames_count)
            VALUES (?, ?, ?, ?, 0)`,
      args: [id, deviceId, nowMs, expiresAt],
    },
  ]);
  clearFrame(deviceId);
  return {
    id,
    device_id: deviceId,
    started_at: nowMs,
    expires_at: expiresAt,
    ended_at: null,
    last_frame_at: null,
    frames_count: 0,
  };
}

export async function activeShare(
  deviceId: string,
  nowMs = Date.now(),
): Promise<ShareSession | null> {
  const row = await qGet<ShareSession>(
    `SELECT * FROM share_sessions
     WHERE device_id = ? AND ended_at IS NULL AND expires_at > ?
     ORDER BY started_at DESC LIMIT 1`,
    deviceId,
    nowMs,
  );
  return row ?? null;
}

export async function getShare(shareId: string): Promise<ShareSession | null> {
  const row = await qGet<ShareSession>(
    "SELECT * FROM share_sessions WHERE id = ?",
    shareId,
  );
  return row ?? null;
}

export async function recordFrame(
  shareId: string,
  nowMs = Date.now(),
): Promise<boolean> {
  const result = await qRun(
    `UPDATE share_sessions
     SET last_frame_at = ?, frames_count = frames_count + 1
     WHERE id = ? AND ended_at IS NULL AND expires_at > ?`,
    nowMs,
    shareId,
    nowMs,
  );
  return result.changes > 0;
}

export async function stopShare(deviceId: string, nowMs = Date.now()): Promise<void> {
  await qRun(
    "UPDATE share_sessions SET ended_at = ? WHERE device_id = ? AND ended_at IS NULL",
    nowMs,
    deviceId,
  );
  clearFrame(deviceId);
}

export function isShareLive(
  share: ShareSession | null,
  nowMs = Date.now(),
): boolean {
  return Boolean(
    share &&
      share.ended_at === null &&
      share.expires_at > nowMs &&
      share.last_frame_at !== null &&
      nowMs - share.last_frame_at <= FRAME_FRESH_MS,
  );
}
