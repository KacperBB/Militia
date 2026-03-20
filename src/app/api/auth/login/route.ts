import { NextRequest, NextResponse } from "next/server";

import { getClientFingerprint, getRequestIp, getRequestUserAgent } from "@/lib/auth/request";
import { loginUser } from "@/lib/auth/service";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validators";
import {
  recordLoginFailure,
  clearLoginFailures,
  isAccountLocked,
} from "@/lib/auth/login-lockout";
import { toPublicAuthError } from "@/lib/security/auth-errors";
import { assertJsonRequest, isTrustedOrigin } from "@/lib/security/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { badRequest, ok, tooManyRequests } from "@/lib/security/responses";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return badRequest("Untrusted origin.");
  }

  if (!assertJsonRequest(request)) {
    return badRequest("Content-Type must be application/json.");
  }

  const rate = enforceRateLimit({
    key: `auth:login:${getClientFingerprint(request)}`,
    limit: 15,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return tooManyRequests(rate.retryAfterSeconds);
  }

  try {
    const payload = await request.json();
    const input = loginSchema.parse(payload);

    // Account-level lockout: checked after IP rate-limit to avoid leaking
    // account existence through different error paths.
    const lockout = isAccountLocked(input.identifier);
    if (lockout.locked) {
      return NextResponse.json(
        { message: "Account temporarily locked. Try again later." },
        { status: 429, headers: { "Retry-After": String(lockout.retryAfterSeconds) } },
      );
    }

    try {
      const user = await loginUser(input);

      // Successful login — clear any recorded failures.
      clearLoginFailures(input.identifier);

      const session = await createSession({
        userId: user.id,
        ip: getRequestIp(request),
        userAgent: getRequestUserAgent(request),
      });

      await setSessionCookie(session.sessionToken, session.expiresAt);

      return ok({
        message: "Logged in successfully.",
        user,
      });
    } catch (loginError) {
      // Record the failure for account-level lockout tracking.
      recordLoginFailure(input.identifier);
      throw loginError;
    }
  } catch (error) {
    const publicError = toPublicAuthError(error);
    return NextResponse.json({ message: publicError.message }, { status: publicError.status });
  }
}
