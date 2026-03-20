import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export function buildSessionCookieOptions(expiresAt: Date): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    priority: "high",
  };
}

export function buildShortLivedAuthCookieOptions(maxAgeSeconds: number): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
    priority: "high",
  };
}
