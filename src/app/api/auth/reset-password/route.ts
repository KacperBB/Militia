import { NextRequest, NextResponse } from "next/server";

import { getClientFingerprint } from "@/lib/auth/request";
import { resetPasswordWithToken } from "@/lib/auth/service";
import { clearSessionCookie } from "@/lib/auth/session";
import { resetPasswordSchema } from "@/lib/auth/validators";
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
    key: `auth:reset-password:${getClientFingerprint(request)}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return tooManyRequests(rate.retryAfterSeconds);
  }

  try {
    const payload = await request.json();
    const input = resetPasswordSchema.parse(payload);
    await resetPasswordWithToken(input);
    await clearSessionCookie();

    return ok({
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    const publicError = toPublicAuthError(error);
    return NextResponse.json({ message: publicError.message }, { status: publicError.status });
  }
}
