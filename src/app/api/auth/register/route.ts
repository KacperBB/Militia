import { NextRequest, NextResponse } from "next/server";

import { getClientFingerprint, getRequestIp, getRequestUserAgent } from "@/lib/auth/request";
import { registerUser } from "@/lib/auth/service";
import { registerSchema } from "@/lib/auth/validators";
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
    key: `auth:register:${getClientFingerprint(request)}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return tooManyRequests(rate.retryAfterSeconds);
  }

  try {
    const payload = await request.json();
    const input = registerSchema.parse(payload);

    const result = await registerUser(input, {
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    return ok(
      {
        message: "Registration successful. Check your email to verify your account.",
        user: result.user,
        verification: result.verification,
      },
      201,
    );
  } catch (error) {
    const publicError = toPublicAuthError(error);
    return NextResponse.json({ message: publicError.message }, { status: publicError.status });
  }
}
