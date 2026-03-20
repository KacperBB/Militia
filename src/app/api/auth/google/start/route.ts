import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_GOOGLE_STATE_COOKIE } from "@/lib/auth/constants";
import { buildShortLivedAuthCookieOptions } from "@/lib/auth/cookie-options";
import { generateOpaqueToken } from "@/lib/auth/crypto";
import { buildGoogleAuthorizationUrl, getGoogleOAuthConfig } from "@/lib/auth/google-oauth";

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

  const state = generateOpaqueToken(24);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_GOOGLE_STATE_COOKIE, state, buildShortLivedAuthCookieOptions(10 * 60));

  const redirectUrl = buildGoogleAuthorizationUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
  });

  return NextResponse.redirect(redirectUrl);
}
