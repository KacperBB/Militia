import { createRemoteJWKSet, jwtVerify } from "jose";

import { normalizeEmail, normalizeUsername } from "@/lib/auth/crypto";

const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

type GoogleTokenResponse = {
  id_token?: string;
};

type GoogleIdentity = {
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
};

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/auth/google/callback`,
  };
}

export function buildGoogleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    prompt: "select_account",
    access_type: "online",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForIdToken(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed.");
  }

  const data = (await response.json()) as GoogleTokenResponse;

  if (!data.id_token) {
    throw new Error("Google id_token is missing.");
  }

  return data.id_token;
}

export async function verifyGoogleIdToken(idToken: string, audience: string) {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: [...GOOGLE_ISSUERS],
    audience,
  });

  const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : null;

  if (!email) {
    throw new Error("Google account email is missing.");
  }

  return {
    email,
    emailVerified: payload.email_verified === true,
    givenName: typeof payload.given_name === "string" ? payload.given_name : undefined,
    familyName: typeof payload.family_name === "string" ? payload.family_name : undefined,
  } satisfies GoogleIdentity;
}

export async function buildUniqueGoogleUsername(email: string, existsFn: (candidate: string) => Promise<boolean>) {
  const localPart = email.split("@")[0] || "user";
  const sanitized = normalizeUsername(localPart.replace(/[^a-zA-Z0-9._-]/g, "-")) || "user";

  if (!(await existsFn(sanitized))) {
    return sanitized;
  }

  for (let i = 1; i <= 20; i += 1) {
    const candidate = `${sanitized}-${i}`;
    if (!(await existsFn(candidate))) {
      return candidate;
    }
  }

  const fallback = `${sanitized}-${Date.now().toString(36)}`;
  return fallback.slice(0, 30);
}
