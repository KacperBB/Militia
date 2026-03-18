import { NextRequest, NextResponse } from "next/server";

import { getClientFingerprint, getRequestIp, getRequestUserAgent } from "@/lib/auth/request";
import { requestPasswordReset } from "@/lib/auth/service";
import { forgotPasswordSchema } from "@/lib/auth/validators";
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
    key: `auth:forgot-password:${getClientFingerprint(request)}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });

  if (!rate.allowed) {
    return tooManyRequests(rate.retryAfterSeconds);
  }

  try {
    const payload = await request.json();
    const input = forgotPasswordSchema.parse(payload);
    const result = await requestPasswordReset(input, {
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    return ok({
      message: "If the account exists, a password reset email has been sent.",
      preview: result.mail,
    });
  } catch (error) {
    const publicError = toPublicAuthError(error);
    return NextResponse.json({ message: publicError.message }, { status: publicError.status });
  }
}
