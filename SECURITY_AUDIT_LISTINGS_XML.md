# Security Audit: Listings + XML Import

Date: 2026-03-19
Scope:
- Listing creation/update flows
- Listing status workflows
- Taxonomy XML preview/commit flows
- Supporting security helpers (origin checks, rate limit, geocoding fallback)

## Executive Summary

The listings and XML paths are generally well protected with authentication, role checks, schema validation and origin/content-type checks. Two hardening changes were applied during this audit:

1. Added XML payload size limit in taxonomy preview endpoint to reduce DoS risk.
2. Replaced unsafe raw SQL calls with parameterized Prisma raw queries where possible.

Additionally, a test suite was added for edge and nominal cases across listings and XML components.

## Findings

### High
- None identified after applied fixes.

### Medium
- In-memory rate limiter in `src/lib/security/rate-limit.ts` is per-process only.
  - Impact: limits can be bypassed under horizontal scaling or process restarts.
  - Recommendation: move to distributed limiter (Redis/Upstash) with consistent keys.

- In-memory taxonomy draft store in `src/lib/taxonomy/draft-store.ts` is process-local.
  - Impact: draft preview/commit may fail across instances and can be lost on restart.
  - Recommendation: move draft persistence to DB/Redis with TTL.

### Low
- Some user-facing listing image URLs are external and only validated as http/https.
  - Impact: potential content quality/trust issues, not direct server-side SSRF in current flow.
  - Recommendation: enforce allow-list of image hosts for listing media, or proxy media via trusted pipeline.

## Verified Controls

- AuthN/AuthZ:
  - Listing create requires active, verified user.
  - Listing edit requires owner or staff.
  - Taxonomy import endpoints require admin.

- Input validation:
  - Listing payload validated via zod.
  - XML parser validates structure, types, duplicates, and cycles.
  - Price bounds constrained to Int-compatible max.

- Transport/request checks:
  - Origin checks via `isTrustedOrigin`.
  - JSON content-type assertions for mutating endpoints.

- Data integrity:
  - Required category attributes enforced.
  - Submitted attribute IDs validated against selected category inheritance chain.

## Changes Applied in This Audit

- `src/app/api/admin/taxonomy/preview/route.ts`
  - Added `MAX_XML_PREVIEW_CHARS` with zod `.max(...)` to cap XML input size.

- `src/app/api/admin/taxonomy/commit/route.ts`
  - Added Prisma import and replaced selected `executeRawUnsafe` calls with parameterized `$executeRaw` + `Prisma.join`.

- `src/lib/posts/status-rules.ts`
  - Extracted pure status rules for safer testing and clearer boundaries.

- `src/lib/posts/status.ts`
  - Re-exported status rules from pure module while retaining DB lifecycle logic.

## Test Coverage Added

Test runner uses Node test via tsx.

- `tests/xml-import.test.ts`
  - Valid nested parse
  - Tree build
  - Duplicate slug rejection
  - Select-without-options rejection
  - Text-with-options rejection
  - Category cycle rejection

- `tests/http-security.test.ts`
  - Trusted origin behavior
  - Invalid origin rejection
  - JSON content-type checks

- `tests/rate-limit.test.ts`
  - Limit boundary behavior
  - Window reset behavior

- `tests/posts-status.test.ts`
  - Transition matrix checks
  - Validity-date boundary
  - Price guard constants and formatting

- `tests/geocode.test.ts`
  - Empty-city short-circuit
  - Google geocode happy path
  - Nominatim fallback path

## Commands Executed

- `npm test` -> PASS (19 tests)
- `npm run build` -> PASS

## Recommended Next Steps

1. Add integration tests for API route handlers (auth, payload, and category-attribute edge cases) with module mocking.
2. Replace in-memory rate limiter with distributed backend.
3. Move taxonomy draft-store from memory to durable TTL store.
4. Add host allow-list for listing image URLs.
