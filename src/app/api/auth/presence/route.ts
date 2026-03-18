import { NextRequest, NextResponse } from "next/server";

import {
  getCurrentSession,
  isSessionActive,
  touchCurrentSession,
} from "@/lib/auth/session";
import { isTrustedOrigin } from "@/lib/security/http";
import { badRequest } from "@/lib/security/responses";

export async function GET() {
  const session = await getCurrentSession({ touch: false });

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        active: false,
        lastSeenAt: null,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      active: isSessionActive(session),
      lastSeenAt: session.last_seen_at,
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return badRequest("Untrusted origin.");
  }

  const session = await touchCurrentSession();

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        active: false,
        lastSeenAt: null,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      active: true,
      lastSeenAt: session.last_seen_at,
    },
    { status: 200 },
  );
}