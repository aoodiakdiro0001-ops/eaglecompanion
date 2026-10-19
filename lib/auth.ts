import { cookies } from "next/headers";
import type { User } from "@/types";
import {
  hashPassword,
  hashSessionToken,
  randomToken,
  verifyPassword,
} from "./crypto";
import { qGet, qRun, qTxn } from "./db";
import { newId, now } from "./ids";

export const SESSION_COOKIE = "eagle_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class DuplicateEmailError extends Error {
  constructor() {
    super("duplicate email");
  }
}

interface UserRow extends User {
  password_hash: string;
}

export function publicUser(row: UserRow | User): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    created_at: row.created_at,
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return qGet<UserRow>(
    "SELECT * FROM users WHERE email = ?",
    email.trim().toLowerCase(),
  );
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: User; workspaceId: string }> {
  const email = input.email.trim().toLowerCase();
  if (await findUserByEmail(email)) throw new DuplicateEmailError();

  const passwordHash = await hashPassword(input.password);
  const userId = newId("usr");
  const workspaceId = newId("ws");
  const createdAt = now();

  await qTxn([
    {
      sql: "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [userId, email, input.name.trim(), passwordHash, createdAt],
    },
    {
      sql: "INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)",
      args: [workspaceId, `مساحة ${input.name.trim()}`, userId, createdAt],
    },
    {
      sql: "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)",
      args: [workspaceId, userId, createdAt],
    },
  ]);

  return {
    user: { id: userId, email, name: input.name.trim(), created_at: createdAt },
    workspaceId,
  };
}

export async function authenticate(
  email: string,
  password: string,
): Promise<User | null> {
  const row = await findUserByEmail(email);
  if (!row) return null;
  const valid = await verifyPassword(password, row.password_hash);
  return valid ? publicUser(row) : null;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken(32);
  const createdAt = now();
  const expiresAt = createdAt + SESSION_TTL_MS;
  await qRun(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    newId("sess"),
    userId,
    hashSessionToken(token),
    expiresAt,
    createdAt,
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
  return token;
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await qGet<
    User & { expires_at: number }
  >(
    `SELECT u.id, u.email, u.name, u.created_at, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`,
    hashSessionToken(token),
  );

  if (!row) return null;
  if (row.expires_at <= now()) {
    await qRun("DELETE FROM sessions WHERE token_hash = ?", hashSessionToken(token));
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    created_at: row.created_at,
  };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await qRun("DELETE FROM sessions WHERE token_hash = ?", hashSessionToken(token));
  }
  store.delete(SESSION_COOKIE);
}
