import { NextResponse } from "next/server";

import { getSafeUserById } from "@/lib/auth/service";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await getSafeUserById(session.user_id);

  return NextResponse.json({ user });
}
