import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { AUTH_SESSION_COOKIE, SESSION_DURATION_DAYS } from "@/lib/auth/constants";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/auth/crypto";

export const USER_ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export async function createSession(input: {
  userId: string;
  ip?: string;
  userAgent?: string;
}) {
  const sessionToken = generateOpaqueToken(48);
  const sessionTokenHash = hashOpaqueToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.user_sessions.create({
    data: {
      user_id: input.userId,
      session_token_hash: sessionTokenHash,
      expires_at: expiresAt,
      ip: input.ip,
      user_agent: input.userAgent,
    },
  });

  return {
    sessionToken,
    expiresAt,
  };
}

export async function setSessionCookie(sessionToken: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE);
}

export function isSessionActive(
  input: { last_seen_at: Date },
  windowMs = USER_ACTIVE_WINDOW_MS,
) {
  return Date.now() - input.last_seen_at.getTime() <= windowMs;
}

export async function getCurrentSession(options?: { touch?: boolean }) {
  const touch = options?.touch ?? true;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  const sessionTokenHash = hashOpaqueToken(sessionToken);
  const session = await db.user_sessions.findUnique({
    where: {
      session_token_hash: sessionTokenHash,
    },
    include: {
      user: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!session || session.expires_at < new Date()) {
    return null;
  }

  if (touch) {
    const now = new Date();

    await db.user_sessions.update({
      where: { id: session.id },
      data: { last_seen_at: now },
    });

    session.last_seen_at = now;
  }

  return session;
}

export async function touchCurrentSession() {
  const session = await getCurrentSession({ touch: false });

  if (!session) {
    return null;
  }

  const now = new Date();

  await db.user_sessions.update({
    where: { id: session.id },
    data: { last_seen_at: now },
  });

  session.last_seen_at = now;
  return session;
}

export async function revokeSession(sessionToken: string) {
  const sessionTokenHash = hashOpaqueToken(sessionToken);
  await db.user_sessions.deleteMany({
    where: {
      session_token_hash: sessionTokenHash,
    },
  });
}
