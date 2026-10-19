import type { ShareSession } from "@/types";
import { getDb } from "./db";
import { clearFrame } from "./frames";
import { newId, now } from "./ids";

export const SHARE_TTL_MS = 10 * 60 * 1000;
export const FRAME_FRESH_MS = 5 * 1000;

export function startShare(deviceId: string, nowMs = Date.now()): ShareSession {
  const db = getDb();
  const id = newId("shr");
  const expiresAt = nowMs + SHARE_TTL_MS;
  db.transaction(() => {
    db.prepare(
      "UPDATE share_sessions SET ended_at = ? WHERE device_id = ? AND ended_at IS NULL",
    ).run(nowMs, deviceId);
    db.prepare(
      `INSERT INTO share_sessions (id, device_id, started_at, expires_at, frames_count)
       VALUES (?, ?, ?, ?, 0)`,
    ).run(id, deviceId, nowMs, expiresAt);
  })();
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

export function activeShare(
  deviceId: string,
  nowMs = Date.now(),
): ShareSession | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM share_sessions
       WHERE device_id = ? AND ended_at IS NULL AND expires_at > ?
       ORDER BY started_at DESC LIMIT 1`,
    )
    .get(deviceId, nowMs) as ShareSession | undefined;
  return row ?? null;
}

export function getShare(shareId: string): ShareSession | null {
  const row = getDb()
    .prepare("SELECT * FROM share_sessions WHERE id = ?")
    .get(shareId) as ShareSession | undefined;
  return row ?? null;
}

export function recordFrame(
  shareId: string,
  nowMs = Date.now(),
): boolean {
  const result = getDb()
    .prepare(
      `UPDATE share_sessions
       SET last_frame_at = ?, frames_count = frames_count + 1
       WHERE id = ? AND ended_at IS NULL AND expires_at > ?`,
    )
    .run(nowMs, shareId, nowMs);
  return result.changes > 0;
}

export function stopShare(deviceId: string, nowMs = Date.now()): void {
  getDb()
    .prepare(
      "UPDATE share_sessions SET ended_at = ? WHERE device_id = ? AND ended_at IS NULL",
    )
    .run(nowMs, deviceId);
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
