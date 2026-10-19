import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "../lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests under the limit", () => {
    expect(rateLimit("a", 2, 1000, 0).allowed).toBe(true);
    expect(rateLimit("a", 2, 1000, 10).allowed).toBe(true);
    expect(rateLimit("a", 2, 1000, 20).allowed).toBe(false);
  });

  it("reports retry time and recovers after the window", () => {
    rateLimit("b", 1, 1000, 0);
    const blocked = rateLimit("b", 1, 1000, 400);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(600);
    expect(rateLimit("b", 1, 1000, 1001).allowed).toBe(true);
  });

  it("isolates keys", () => {
    rateLimit("c", 1, 1000, 0);
    expect(rateLimit("d", 1, 1000, 0).allowed).toBe(true);
  });
});
