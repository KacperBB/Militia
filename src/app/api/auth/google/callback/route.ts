import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_GOOGLE_STATE_COOKIE } from "@/lib/auth/constants";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import {
  buildUniqueGoogleUsername,
  exchangeGoogleCodeForIdToken,
  getGoogleOAuthConfig,
  verifyGoogleIdToken,
} from "@/lib/auth/google-oauth";
import { DEFAULT_USER_AVATAR_URL } from "@/lib/auth/default-avatars";
import { getRequestIp, getRequestUserAgent } from "@/lib/auth/request";
import { db } from "@/lib/db";

function loginUrlWithError(request: NextRequest, error: string) {
  const url = new URL("/auth/login", request.url);
  url.searchParams.set("error", error);
  return url;
}

export async function GET(request: NextRequest) {
  const config = getGoogleOAuthConfig();

  if (!config) {
    return NextResponse.redirect(loginUrlWithError(request, "google-not-configured"));
  }

  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");

  if (!state || !code) {
    return NextResponse.redirect(loginUrlWithError(request, "google-missing-code"));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(AUTH_GOOGLE_STATE_COOKIE)?.value;
  cookieStore.delete(AUTH_GOOGLE_STATE_COOKIE);

  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(loginUrlWithError(request, "google-invalid-state"));
  }

  try {
    const idToken = await exchangeGoogleCodeForIdToken({
      code,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });

    const identity = await verifyGoogleIdToken(idToken, config.clientId);

    if (!identity.emailVerified) {
      return NextResponse.redirect(loginUrlWithError(request, "google-email-not-verified"));
    }

    let user = await db.users.findUnique({
      where: { email: identity.email },
    });

    if (!user) {
      const username = await buildUniqueGoogleUsername(identity.email, async (candidate) => {
        const exists = await db.users.findUnique({ where: { username: candidate } });
        return Boolean(exists);
      });

      user = await db.users.create({
        data: {
          email: identity.email,
          username,
          first_name: identity.givenName,
          last_name: identity.familyName,
          avatar_url: DEFAULT_USER_AVATAR_URL,
          role: "USER",
          status: "ACTIVE",
          email_verified_at: new Date(),
        },
      });
    } else if (!user.email_verified_at) {
      user = await db.users.update({
        where: { id: user.id },
        data: {
          email_verified_at: new Date(),
        },
      });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.redirect(loginUrlWithError(request, "account-disabled"));
    }

    const session = await createSession({
      userId: user.id,
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    await setSessionCookie(session.sessionToken, session.expiresAt);
    return NextResponse.redirect(new URL("/", request.url));
  } catch {
    return NextResponse.redirect(loginUrlWithError(request, "google-auth-failed"));
  }
}
