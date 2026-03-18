import { NextRequest, NextResponse } from "next/server";

import { getClientFingerprint, getRequestIp, getRequestUserAgent } from "@/lib/auth/request";
import { loginUser } from "@/lib/auth/service";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validators";
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
    const user = await loginUser(input);
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
  } catch (error) {
    const publicError = toPublicAuthError(error);
    return NextResponse.json({ message: publicError.message }, { status: publicError.status });
  }
}
