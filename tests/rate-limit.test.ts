import test from "node:test";
import assert from "node:assert/strict";

import { enforceRateLimit } from "../src/lib/security/rate-limit";

test("enforceRateLimit allows up to configured limit", () => {
  const key = `test-limit-${Date.now()}-a`;

  const first = enforceRateLimit({ key, limit: 2, windowMs: 1000 });
  const second = enforceRateLimit({ key, limit: 2, windowMs: 1000 });
  const third = enforceRateLimit({ key, limit: 2, windowMs: 1000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
});

test("enforceRateLimit resets after window", async () => {
  const key = `test-limit-${Date.now()}-b`;

  enforceRateLimit({ key, limit: 1, windowMs: 20 });
  const blocked = enforceRateLimit({ key, limit: 1, windowMs: 20 });
  assert.equal(blocked.allowed, false);

  await new Promise((resolve) => setTimeout(resolve, 25));

  const afterReset = enforceRateLimit({ key, limit: 1, windowMs: 20 });
  assert.equal(afterReset.allowed, true);
});
