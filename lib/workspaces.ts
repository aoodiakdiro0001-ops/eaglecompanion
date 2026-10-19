import type { MemberRow, Role, Workspace } from "@/types";
import { q, qGet, qRun, qTxn } from "./db";
import { newId, now } from "./ids";
import { hashInviteCode, newInviteCode, normalizeCode } from "./tokens";

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  return q<Workspace>(
    `SELECT w.id, w.name, w.owner_id, w.created_at, m.role
     FROM workspaces w
     JOIN workspace_members m ON m.workspace_id = w.id
     WHERE m.user_id = ?
     ORDER BY w.created_at ASC`,
    userId,
  );
}

export async function getMembership(
  userId: string,
  workspaceId: string,
): Promise<{ workspace_id: string; user_id: string; role: Role } | null> {
  const row = await qGet<{ workspace_id: string; user_id: string; role: Role }>(
    "SELECT workspace_id, user_id, role FROM workspace_members WHERE user_id = ? AND workspace_id = ?",
    userId,
    workspaceId,
  );
  return row ?? null;
}

export async function getWorkspaceForUser(
  userId: string,
  workspaceId: string,
): Promise<Workspace | null> {
  const row = await qGet<Workspace>(
    `SELECT w.id, w.name, w.owner_id, w.created_at, m.role
     FROM workspaces w
     JOIN workspace_members m ON m.workspace_id = w.id
     WHERE w.id = ? AND m.user_id = ?`,
    workspaceId,
    userId,
  );
  return row ?? null;
}

export async function resolveWorkspace(
  userId: string,
  requested?: string | null,
): Promise<Workspace | null> {
  if (requested) {
    const found = await getWorkspaceForUser(userId, requested);
    if (found) return found;
  }
  const all = await listWorkspaces(userId);
  return all[0] ?? null;
}

export async function createWorkspace(userId: string, name: string): Promise<Workspace> {
  const id = newId("ws");
  const createdAt = now();
  await qTxn([
    {
      sql: "INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)",
      args: [id, name.trim(), userId, createdAt],
    },
    {
      sql: "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)",
      args: [id, userId, createdAt],
    },
  ]);
  return { id, name: name.trim(), owner_id: userId, created_at: createdAt, role: "owner" };
}

export async function listMembers(workspaceId: string): Promise<MemberRow[]> {
  return q<MemberRow>(
    `SELECT m.user_id, u.name, u.email, m.role, m.created_at
     FROM workspace_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.workspace_id = ?
     ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'member' THEN 1 ELSE 2 END, m.created_at ASC`,
    workspaceId,
  );
}

export async function createInvite(
  workspaceId: string,
  userId: string,
  role: "member" | "viewer",
): Promise<{ code: string; expiresAt: number }> {
  const code = newInviteCode();
  const createdAt = now();
  const expiresAt = createdAt + INVITE_TTL_MS;
  await qRun(
    `INSERT INTO invite_codes (id, workspace_id, code_hash, role, created_by, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    newId("inv"),
    workspaceId,
    hashInviteCode(code),
    role,
    userId,
    expiresAt,
    createdAt,
  );
  return { code, expiresAt };
}

export async function listActiveInvites(workspaceId: string) {
  return q<{
    id: string;
    role: Role;
    expires_at: number;
    created_at: number;
  }>(
    `SELECT id, role, expires_at, created_at FROM invite_codes
     WHERE workspace_id = ? AND used_at IS NULL AND expires_at > ?
     ORDER BY created_at DESC LIMIT 10`,
    workspaceId,
    now(),
  );
}

export class InviteError extends Error {}

export async function joinWorkspace(
  userId: string,
  rawCode: string,
): Promise<{ workspaceId: string; role: Role }> {
  const codeHash = hashInviteCode(normalizeCode(rawCode));
  const timestamp = now();
  const row = await qGet<{
    id: string;
    workspace_id: string;
    role: "member" | "viewer";
  }>(
    `SELECT id, workspace_id, role FROM invite_codes
     WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?`,
    codeHash,
    timestamp,
  );

  if (!row) throw new InviteError("كود الدعوة غير صالح أو منتهي");

  const existing = await getMembership(userId, row.workspace_id);
  if (existing) {
    return { workspaceId: row.workspace_id, role: existing.role };
  }

  // Atomic claim prevents two users from consuming the same invite concurrently.
  const claimed = await qRun(
    "UPDATE invite_codes SET used_at = ? WHERE id = ? AND used_at IS NULL",
    timestamp,
    row.id,
  );
  if (claimed.changes === 0) throw new InviteError("كود الدعوة غير صالح أو منتهي");

  await qRun(
    "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?)",
    row.workspace_id,
    userId,
    row.role,
    timestamp,
  );

  return { workspaceId: row.workspace_id, role: row.role };
}
