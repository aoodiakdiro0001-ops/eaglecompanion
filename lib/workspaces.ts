import type { MemberRow, Role, Workspace } from "@/types";
import { getDb } from "./db";
import { newId, now } from "./ids";
import { hashInviteCode, newInviteCode, normalizeCode } from "./tokens";

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export function listWorkspaces(userId: string): Workspace[] {
  return getDb()
    .prepare(
      `SELECT w.id, w.name, w.owner_id, w.created_at, m.role
       FROM workspaces w
       JOIN workspace_members m ON m.workspace_id = w.id
       WHERE m.user_id = ?
       ORDER BY w.created_at ASC`,
    )
    .all(userId) as Workspace[];
}

export function getMembership(
  userId: string,
  workspaceId: string,
): { workspace_id: string; user_id: string; role: Role } | null {
  const row = getDb()
    .prepare(
      "SELECT workspace_id, user_id, role FROM workspace_members WHERE user_id = ? AND workspace_id = ?",
    )
    .get(userId, workspaceId) as
    | { workspace_id: string; user_id: string; role: Role }
    | undefined;
  return row ?? null;
}

export function getWorkspaceForUser(
  userId: string,
  workspaceId: string,
): Workspace | null {
  const row = getDb()
    .prepare(
      `SELECT w.id, w.name, w.owner_id, w.created_at, m.role
       FROM workspaces w
       JOIN workspace_members m ON m.workspace_id = w.id
       WHERE w.id = ? AND m.user_id = ?`,
    )
    .get(workspaceId, userId) as Workspace | undefined;
  return row ?? null;
}

export function resolveWorkspace(
  userId: string,
  requested?: string | null,
): Workspace | null {
  if (requested) {
    const found = getWorkspaceForUser(userId, requested);
    if (found) return found;
  }
  const all = listWorkspaces(userId);
  return all[0] ?? null;
}

export function createWorkspace(userId: string, name: string): Workspace {
  const id = newId("ws");
  const createdAt = now();
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      "INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)",
    ).run(id, name.trim(), userId, createdAt);
    db.prepare(
      "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)",
    ).run(id, userId, createdAt);
  })();
  return { id, name: name.trim(), owner_id: userId, created_at: createdAt, role: "owner" };
}

export function listMembers(workspaceId: string): MemberRow[] {
  return getDb()
    .prepare(
      `SELECT m.user_id, u.name, u.email, m.role, m.created_at
       FROM workspace_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.workspace_id = ?
       ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'member' THEN 1 ELSE 2 END, m.created_at ASC`,
    )
    .all(workspaceId) as MemberRow[];
}

export function createInvite(
  workspaceId: string,
  userId: string,
  role: "member" | "viewer",
): { code: string; expiresAt: number } {
  const code = newInviteCode();
  const createdAt = now();
  const expiresAt = createdAt + INVITE_TTL_MS;
  getDb()
    .prepare(
      `INSERT INTO invite_codes (id, workspace_id, code_hash, role, created_by, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(newId("inv"), workspaceId, hashInviteCode(code), role, userId, expiresAt, createdAt);
  return { code, expiresAt };
}

export function listActiveInvites(workspaceId: string) {
  return getDb()
    .prepare(
      `SELECT id, role, expires_at, created_at FROM invite_codes
       WHERE workspace_id = ? AND used_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC LIMIT 10`,
    )
    .all(workspaceId, now()) as Array<{
    id: string;
    role: Role;
    expires_at: number;
    created_at: number;
  }>;
}

export class InviteError extends Error {}

export function joinWorkspace(
  userId: string,
  rawCode: string,
): { workspaceId: string; role: Role } {
  const codeHash = hashInviteCode(normalizeCode(rawCode));
  const db = getDb();
  const timestamp = now();
  const row = db
    .prepare(
      `SELECT * FROM invite_codes
       WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?`,
    )
    .get(codeHash, timestamp) as
    | {
        id: string;
        workspace_id: string;
        role: "member" | "viewer";
      }
    | undefined;

  if (!row) throw new InviteError("كود الدعوة غير صالح أو منتهي");

  const existing = getMembership(userId, row.workspace_id);
  if (existing) {
    return { workspaceId: row.workspace_id, role: existing.role };
  }

  db.transaction(() => {
    db.prepare(
      "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?)",
    ).run(row.workspace_id, userId, row.role, timestamp);
    db.prepare("UPDATE invite_codes SET used_at = ? WHERE id = ?").run(
      timestamp,
      row.id,
    );
  })();

  return { workspaceId: row.workspace_id, role: row.role };
}
