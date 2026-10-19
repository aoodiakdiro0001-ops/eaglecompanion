import { createHmac, randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function secret(): string {
  return process.env.SESSION_SECRET ?? "eagle-dev-secret-change-me";
}

function codeDigest(scope: string, value: string): string {
  return createHmac("sha256", secret())
    .update(`${scope}:${value}`)
    .digest("hex");
}

export function newPairingCode(): string {
  let raw = "";
  for (let i = 0; i < 8; i += 1) {
    raw += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashPairingCode(input: string): string {
  return codeDigest("pair", normalizeCode(input));
}

export function hashInviteCode(input: string): string {
  return codeDigest("invite", normalizeCode(input));
}

export function newInviteCode(): string {
  return newPairingCode();
}
