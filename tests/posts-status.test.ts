import test from "node:test";
import assert from "node:assert/strict";

import {
  POST_STATUSES,
  canTransitionToPublished,
  canTransitionToReview,
  canTransitionToReviewed,
  nextValidityDate,
} from "../src/lib/posts/status-rules";
import { MAX_PRICE, MAX_PRICE_CENTS, formatMaxPriceLabel } from "../src/lib/posts/price";

test("status transitions allow only expected states", () => {
  assert.equal(canTransitionToReview(POST_STATUSES.DRAFT), true);
  assert.equal(canTransitionToReview(POST_STATUSES.REVIEWED), true);
  assert.equal(canTransitionToReview(POST_STATUSES.PUBLISHED), false);

  assert.equal(canTransitionToReviewed(POST_STATUSES.IN_REVIEW), true);
  assert.equal(canTransitionToReviewed(POST_STATUSES.DRAFT), false);

  assert.equal(canTransitionToPublished(POST_STATUSES.DRAFT), true);
  assert.equal(canTransitionToPublished(POST_STATUSES.IN_REVIEW), true);
  assert.equal(canTransitionToPublished(POST_STATUSES.REVIEWED), true);
  assert.equal(canTransitionToPublished(POST_STATUSES.CANCELLED), false);
});

test("nextValidityDate returns roughly +30 days", () => {
  const base = new Date("2026-03-01T00:00:00.000Z");
  const next = nextValidityDate(base);

  const diffMs = next.getTime() - base.getTime();
  const expected = 30 * 24 * 60 * 60 * 1000;
  assert.equal(diffMs, expected);
});

test("price guard constants stay aligned with Int range", () => {
  assert.equal(MAX_PRICE_CENTS, 2_147_483_647);
  assert.equal(MAX_PRICE, 21_474_836.47);
  assert.match(formatMaxPriceLabel("pl-PL"), /21\s?474\s?836,47/);
});
