import test from "node:test";
import assert from "node:assert/strict";

import { assertJsonRequest, isTrustedOrigin } from "../src/lib/security/http";

function buildRequest(input: {
  origin?: string;
  host?: string;
  nextOrigin?: string;
  protocol?: string;
  contentType?: string;
}) {
  const headerMap = new Map<string, string>();
  if (input.origin) headerMap.set("origin", input.origin);
  if (input.host) headerMap.set("host", input.host);
  if (input.contentType) headerMap.set("content-type", input.contentType);

  return {
    headers: {
      get: (key: string) => headerMap.get(key.toLowerCase()) ?? null,
    },
    nextUrl: {
      origin: input.nextOrigin ?? "http://localhost:3000",
      protocol: input.protocol ?? "http:",
    },
  } as any;
}

test("isTrustedOrigin returns true for missing origin header", () => {
  const request = buildRequest({ host: "localhost:3000" });
  assert.equal(isTrustedOrigin(request), true);
});

test("isTrustedOrigin returns false for invalid origin", () => {
  const request = buildRequest({ origin: "not-a-url", host: "localhost:3000" });
  assert.equal(isTrustedOrigin(request), false);
});

test("isTrustedOrigin accepts same-host origin in development", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  const request = buildRequest({
    origin: "http://localhost:3000",
    host: "localhost:3000",
    nextOrigin: "http://localhost:3000",
  });

  assert.equal(isTrustedOrigin(request), true);
  process.env.NODE_ENV = previous;
});

test("assertJsonRequest validates application/json content type", () => {
  const request = buildRequest({ contentType: "application/json; charset=utf-8" });
  assert.equal(assertJsonRequest(request), true);
});

test("assertJsonRequest rejects non-json content type", () => {
  const request = buildRequest({ contentType: "text/plain" });
  assert.equal(assertJsonRequest(request), false);
});
