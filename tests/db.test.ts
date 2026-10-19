import { afterAll, describe, expect, it } from "vitest";
import { getDb, resetDbForTests } from "../lib/db";

afterAll(() => resetDbForTests());

describe("database schema", () => {
  it("creates every required table", () => {
    const rows = getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as Array<{ name: string }>;
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

  it("enforces foreign keys", () => {
    expect(() =>
      getDb()
        .prepare(
          "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES ('nope', 'nada', 'owner', 0)",
        )
        .run(),
    ).toThrow();
  });
});
