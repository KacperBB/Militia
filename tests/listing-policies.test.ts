import test from "node:test";
import assert from "node:assert/strict";

import {
  canCreateListing,
  canEditListing,
  ownerEditRequiresReview,
} from "../src/lib/posts/policies";

test("canCreateListing allows active verified USER", () => {
  assert.equal(
    canCreateListing({ id: "u1", role: "USER", status: "ACTIVE", email_verified_at: new Date() }),
    true,
  );
});

test("canCreateListing blocks null viewer", () => {
  assert.equal(canCreateListing(null), false);
});

test("canCreateListing blocks active but unverified viewer", () => {
  assert.equal(
    canCreateListing({ id: "u1", role: "USER", status: "ACTIVE", email_verified_at: null }),
    false,
  );
});

test("canCreateListing blocks banned viewer", () => {
  assert.equal(
    canCreateListing({ id: "u1", role: "USER", status: "BANNED", email_verified_at: new Date() }),
    false,
  );
});

test("canEditListing allows owner", () => {
  assert.equal(canEditListing("u1", { id: "u1", role: "USER" }), true);
});

test("canEditListing allows moderator", () => {
  assert.equal(canEditListing("u1", { id: "m1", role: "MODERATOR" }), true);
});

test("canEditListing allows admin", () => {
  assert.equal(canEditListing("u1", { id: "a1", role: "ADMIN" }), true);
});

test("canEditListing blocks non-owner basic user", () => {
  assert.equal(canEditListing("u1", { id: "u2", role: "USER" }), false);
});

test("ownerEditRequiresReview is true for owner USER", () => {
  assert.equal(ownerEditRequiresReview("u1", { id: "u1", role: "USER" }), true);
});

test("ownerEditRequiresReview is false for owner ADMIN", () => {
  assert.equal(ownerEditRequiresReview("u1", { id: "u1", role: "ADMIN" }), false);
});

test("ownerEditRequiresReview is false for moderator editing foreign post", () => {
  assert.equal(ownerEditRequiresReview("u1", { id: "m1", role: "MODERATOR" }), false);
});
