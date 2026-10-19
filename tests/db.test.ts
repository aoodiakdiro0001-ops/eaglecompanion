import { afterAll, describe, expect, it } from "vitest";
import { q, qRun, resetDbForTests } from "../lib/db";

afterAll(() => resetDbForTests());

describe("database schema", () => {
  it("creates every required table", async () => {
    const rows = await q<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    const names = rows.map((row) => row.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "users",
        "sessions",
        "workspaces",
        "workspace_members",
        "devices",
        "pairing_codes",
        "invite_codes",
        "share_sessions",
        "audit_logs",
      ]),
    );
  });

  it("enforces foreign keys", async () => {
    await expect(
      qRun(
        "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES ('nope', 'nada', 'owner', 0)",
      ),
    ).rejects.toThrow();
  });
});
