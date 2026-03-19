import type { NextRequest } from "next/server";

const ALLOWED_METHODS = "GET,POST,OPTIONS";

export function getSecurityHeaders() {
  return {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Content-Security-Policy": "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'self' https://www.openstreetmap.org; object-src 'none'; img-src 'self' data: https://utfs.io https://*.ufs.sh https://*.uploadthing.com https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://places.googleapis.com https://*.uploadthing.com https://utfs.io https://*.ufs.sh;",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    Allow: ALLOWED_METHODS,
  };
}

export function isTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    const localhostHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    if (localhostHosts.has(parsedOrigin.hostname)) {
      return true;
    }
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const configuredOrigins = configuredAppUrl
    ? configuredAppUrl
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const host = request.headers.get("host")?.trim();

  const inferredForwardedOrigin = forwardedHost
    ? `${forwardedProto || request.nextUrl.protocol.replace(":", "")}://${forwardedHost}`
    : null;

  const inferredHostOrigin = host
    ? `${forwardedProto || request.nextUrl.protocol.replace(":", "")}://${host}`
    : null;

  const rawAllowedOrigins = [
    request.nextUrl.origin,
    inferredForwardedOrigin,
    inferredHostOrigin,
    ...configuredOrigins,
  ].filter((value): value is string => Boolean(value));
  const allowedOrigins = new Set<string>();
  const allowedHostPort = new Set<string>();

  for (const candidate of rawAllowedOrigins) {
    try {
      const parsed = new URL(candidate);
      allowedOrigins.add(parsed.origin);
      allowedHostPort.add(`${parsed.hostname}:${parsed.port || "default"}`);
    } catch {
      continue;
    }
  }

  if (allowedOrigins.has(parsedOrigin.origin)) {
    return true;
  }

  const requestHostPort = `${parsedOrigin.hostname}:${parsedOrigin.port || "default"}`;
  return allowedHostPort.has(requestHostPort);
}

export function assertJsonRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().includes("application/json");
}
