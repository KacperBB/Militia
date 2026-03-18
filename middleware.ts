import { NextResponse, type NextRequest } from "next/server";

import { getClientFingerprint } from "@/lib/auth/request";
import { getSecurityHeaders, isTrustedOrigin } from "@/lib/security/http";
import { enforceMiddlewareRateLimit } from "@/lib/security/middleware-rate-limit";

function applySecurityHeaders(response: NextResponse) {
  const headers = getSecurityHeaders();

  for (const [header, value] of Object.entries(headers)) {
    response.headers.set(header, value);
  }

  return response;
}

function shouldRateLimit(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/api/");
}

function getRatePolicy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const method = request.method.toUpperCase();

  if (path === "/api/auth/login" && method === "POST") {
    return { limit: 12, windowMs: 10 * 60 * 1000 };
  }

  if (path === "/api/auth/register" && method === "POST") {
    return { limit: 8, windowMs: 10 * 60 * 1000 };
  }

  if (path === "/api/auth/forgot-password" && method === "POST") {
    return { limit: 6, windowMs: 15 * 60 * 1000 };
  }

  if (path === "/api/auth/reset-password" && method === "POST") {
    return { limit: 10, windowMs: 10 * 60 * 1000 };
  }

  if (path === "/api/auth/verify-email" && method === "POST") {
    return { limit: 20, windowMs: 10 * 60 * 1000 };
  }

  if (path === "/api/auth/presence" && method === "POST") {
    return { limit: 120, windowMs: 5 * 60 * 1000 };
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return { limit: 120, windowMs: 60 * 1000 };
  }

  return { limit: 300, windowMs: 60 * 1000 };
}

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)
  ) {
    if (!isTrustedOrigin(request)) {
      return applySecurityHeaders(
        NextResponse.json(
          { message: "Blocked by origin policy." },
          { status: 403 },
        ),
      );
    }
  }

  if (shouldRateLimit(request)) {
    const policy = getRatePolicy(request);
    const fingerprint = getClientFingerprint(request);
    const key = `${request.method}:${request.nextUrl.pathname}:${fingerprint}`;
    const rate = enforceMiddlewareRateLimit({
      key,
      limit: policy.limit,
      windowMs: policy.windowMs,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { message: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSeconds),
            "X-RateLimit-Limit": String(rate.limit),
            "X-RateLimit-Remaining": String(rate.remaining),
          },
        },
      );

      return applySecurityHeaders(response);
    }
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
