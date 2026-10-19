interface Bucket {
  hits: number[];
}

declare global {
  // eslint-disable-next-line no-var
  var __eagleRateLimits: Map<string, Bucket> | undefined;
}

function buckets(): Map<string, Bucket> {
  if (!globalThis.__eagleRateLimits) {
    globalThis.__eagleRateLimits = new Map();
  }
  return globalThis.__eagleRateLimits;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  nowMs = Date.now(),
): RateLimitResult {
  const store = buckets();
  const bucket = store.get(key) ?? { hits: [] };
  const cutoff = nowMs - windowMs;
  bucket.hits = bucket.hits.filter((hit) => hit > cutoff);
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? nowMs;
    store.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - nowMs),
    };
  }
  bucket.hits.push(nowMs);
  store.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.hits.length),
    retryAfterMs: 0,
  };
}

export function resetRateLimits(): void {
  buckets().clear();
}
