import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('owner','member','viewer')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_members_user ON workspace_members(user_id);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT,
  model TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  battery_level INTEGER,
  battery_charging INTEGER,
  network_type TEXT,
  screen_w INTEGER,
  screen_h INTEGER,
  user_agent TEXT,
  paired_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_devices_workspace ON devices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token_hash);

CREATE TABLE IF NOT EXISTS pairing_codes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('member','viewer')),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS share_sessions (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ended_at INTEGER,
  last_frame_at INTEGER,
  frames_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_share_device ON share_sessions(device_id, ended_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_workspace ON audit_logs(workspace_id, created_at);
`;

declare global {
  // eslint-disable-next-line no-var
  var __eagleClient: Client | undefined;
  // eslint-disable-next-line no-var
  var __eagleSchema: Promise<void> | undefined;
}

function normalizeUrl(raw: string): string {
  if (
    raw === ":memory:" ||
    raw.startsWith("file:") ||
    raw.startsWith("libsql:") ||
    raw.startsWith("https://") ||
    raw.startsWith("http://")
  ) {
    return raw;
  }
  return `file:${raw}`;
}

function open(): Client {
  const raw = process.env.TURSO_DATABASE_URL || process.env.DATABASE_PATH || "./data/eagle.db";
  const url = normalizeUrl(raw);
  if (url.startsWith("file:")) {
    const target = path.resolve(url.slice("file:".length));
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }
  const isRemote = !url.startsWith("file:") && url !== ":memory:";
  return createClient({
    url: url.startsWith("file:") ? `file:${path.resolve(url.slice("file:".length))}` : url,
    authToken: isRemote ? process.env.TURSO_AUTH_TOKEN : undefined,
  });
}

function getClient(): Client {
  if (!globalThis.__eagleClient) {
    globalThis.__eagleClient = open();
  }
  return globalThis.__eagleClient;
}

export async function ensureSchema(): Promise<void> {
  if (!globalThis.__eagleSchema) {
    globalThis.__eagleSchema = (async () => {
      const client = getClient();
      const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_PATH || "./data/eagle.db";
      if (url.startsWith("file:") || url === ":memory:" || !url.includes(":")) {
        try {
          await client.execute("PRAGMA journal_mode = WAL");
          await client.execute("PRAGMA foreign_keys = ON");
        } catch {
          // older local engines may reject pragmas; foreign keys verified by tests
        }
      }
      await client.executeMultiple(SCHEMA);
    })();
  }
  await globalThis.__eagleSchema;
}

export interface RunResult {
  changes: number;
}

export async function q<T>(sql: string, ...args: InValue[]): Promise<T[]> {
  await ensureSchema();
  const res = await getClient().execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function qGet<T>(sql: string, ...args: InValue[]): Promise<T | undefined> {
  const rows = await q<T>(sql, ...args);
  return rows[0];
}

export async function qRun(sql: string, ...args: InValue[]): Promise<RunResult> {
  await ensureSchema();
  const res = await getClient().execute({ sql, args });
  return { changes: Number(res.rowsAffected) };
}

export async function qTxn(
  statements: Array<{ sql: string; args: InValue[] }>,
): Promise<void> {
  await ensureSchema();
  await getClient().batch(statements, "write");
}

export async function resetDbForTests(): Promise<void> {
  if (globalThis.__eagleClient) {
    try {
      globalThis.__eagleClient.close();
    } catch {
      // already closed
    }
    globalThis.__eagleClient = undefined;
  }
  globalThis.__eagleSchema = undefined;
}
