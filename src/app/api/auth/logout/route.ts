import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE } from "@/lib/auth/constants";
import { clearSessionCookie, revokeSession } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (sessionToken) {
    await revokeSession(sessionToken);
  }

  await clearSessionCookie();

  return NextResponse.json({ message: "Logged out successfully." });
}
