/**
 * In-process account lockout tracker.
 *
 * After MAX_FAILURES failed login attempts within WINDOW_MS for the same
 * normalised identifier (email or username), the account is locked for
 * LOCKOUT_MS.  On success, failures are cleared.
 *
 * This is a defence-in-depth layer on top of IP-based rate limiting.
 * The in-memory store resets on restart; for multi-instance deployments
 * move to a distributed TTL store (Redis / Upstash).
 */

const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 min counting window
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min lockout after threshold

type LockoutBucket = {
  failures: number;
  lockedUntil: number | null;
  windowResetAt: number;
};

const buckets = new Map<string, LockoutBucket>();

function normalizeKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function cleanup(now: number): void {
  for (const [key, bucket] of buckets.entries()) {
    const lockedUntil = bucket.lockedUntil ?? 0;
    if (bucket.windowResetAt <= now && lockedUntil <= now) {
      buckets.delete(key);
    }
  }
}

export function recordLoginFailure(identifier: string): void {
  const now = Date.now();
  if (buckets.size > 10_000) cleanup(now);

  const key = normalizeKey(identifier);
  const existing = buckets.get(key);

  if (!existing || existing.windowResetAt <= now) {
    buckets.set(key, {
      failures: 1,
      lockedUntil: null,
      windowResetAt: now + WINDOW_MS,
    });
    return;
  }

  existing.failures += 1;
  if (existing.failures >= MAX_FAILURES) {
    existing.lockedUntil = now + LOCKOUT_MS;
  }
  buckets.set(key, existing);
}

export function clearLoginFailures(identifier: string): void {
  buckets.delete(normalizeKey(identifier));
}

export function isAccountLocked(identifier: string): {
  locked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const bucket = buckets.get(normalizeKey(identifier));

  if (!bucket || !bucket.lockedUntil || bucket.lockedUntil <= now) {
    return { locked: false, retryAfterSeconds: 0 };
  }

  return {
    locked: true,
    retryAfterSeconds: Math.ceil((bucket.lockedUntil - now) / 1000),
  };
}

/** Exposed only for unit tests — do not call in production code. */
export function _resetBucketsForTesting(): void {
  buckets.clear();
}

export { MAX_FAILURES, WINDOW_MS, LOCKOUT_MS };
