import { describe, expect, it } from "vitest";
import {
  hashDeviceToken,
  hashPassword,
  randomToken,
  verifyPassword,
} from "../lib/crypto";
import {
  hashPairingCode,
  newPairingCode,
  normalizeCode,
} from "../lib/tokens";

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword("correct horse battery", stored)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("wrong password", stored)).resolves.toBe(
      false,
    );
  });

  it("produces a different hash for the same password", async () => {
    const first = await hashPassword("same password");
    const second = await hashPassword("same password");
    expect(first).not.toBe(second);
  });
});

describe("tokens", () => {
  it("creates high-entropy tokens", () => {
    const token = randomToken(32);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hashDeviceToken(token)).not.toBe(token);
    expect(hashDeviceToken(token)).toHaveLength(64);
  });

  it("formats and normalizes pairing codes", () => {
    const code = newPairingCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(normalizeCode(code.toLowerCase())).toBe(normalizeCode(code));
    expect(hashPairingCode("abcd-efgh")).toBe(hashPairingCode("ABCD EFGH"));
  });
});
