import type { AuditLog } from "@/types";
import { q, qRun } from "./db";
import { newId, now } from "./ids";

export interface AuditInput {
  workspaceId: string;
  action: string;
  actorUserId?: string | null;
  deviceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

export async function audit(input: AuditInput): Promise<void> {
  await qRun(
    `INSERT INTO audit_logs
     (id, workspace_id, actor_user_id, device_id, action, metadata, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    newId("aud"),
    input.workspaceId,
    input.actorUserId ?? null,
    input.deviceId ?? null,
    input.action,
    input.metadata ? JSON.stringify(input.metadata) : null,
    input.ip ?? null,
    now(),
  );
}

export async function listAudit(workspaceId: string, limit = 100): Promise<AuditLog[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  return q<AuditLog>(
    `SELECT a.*, u.name AS actor_name, d.name AS device_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_user_id
     LEFT JOIN devices d ON d.id = a.device_id
     WHERE a.workspace_id = ?
     ORDER BY a.created_at DESC LIMIT ?`,
    workspaceId,
    safeLimit,
  );
}
