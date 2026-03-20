import test from "node:test";
import assert from "node:assert/strict";

import { buildSessionCookieOptions, buildShortLivedAuthCookieOptions } from "../src/lib/auth/cookie-options";

test("buildSessionCookieOptions sets expected secure cookie flags", () => {
  const expiresAt = new Date("2026-04-01T00:00:00.000Z");
  const options = buildSessionCookieOptions(expiresAt);

  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.priority, "high");
  assert.equal(options.expires, expiresAt);
});

test("buildShortLivedAuthCookieOptions sets expected short-lived flags", () => {
  const options = buildShortLivedAuthCookieOptions(600);

  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.priority, "high");
  assert.equal(options.maxAge, 600);
});
