type MiddlewareBucket = {
  count: number;
  resetAt: number;
};

const middlewareBuckets = new Map<string, MiddlewareBucket>();

function cleanupBuckets(now: number) {
  for (const [key, bucket] of middlewareBuckets.entries()) {
    if (bucket.resetAt <= now) {
      middlewareBuckets.delete(key);
    }
  }
}

export function enforceMiddlewareRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();

  if (middlewareBuckets.size > 5_000) {
    cleanupBuckets(now);
  }

  const existing = middlewareBuckets.get(input.key);

  if (!existing || existing.resetAt <= now) {
    middlewareBuckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      allowed: true,
      remaining: input.limit - 1,
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
      limit: input.limit,
    };
  }

  existing.count += 1;
  middlewareBuckets.set(input.key, existing);

  return {
    allowed: existing.count <= input.limit,
    remaining: Math.max(input.limit - existing.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
    limit: input.limit,
  };
}