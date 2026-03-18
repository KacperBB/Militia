import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { badRequest, unauthorized } from "@/lib/security/responses";
import { isTrustedOrigin } from "@/lib/security/http";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ flagId: string }> },
) {
  if (!isTrustedOrigin(request)) {
    return badRequest("Untrusted origin.");
  }

  const session = await getCurrentSession();

  if (!session) {
    return unauthorized("You must be logged in.");
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { flagId } = await params;

  const existing = await db.moderation_flags.findUnique({
    where: { id: flagId },
    select: {
      id: true,
      target_type: true,
      status: true,
    },
  });

  if (!existing || existing.target_type !== "USER") {
    return NextResponse.json({ message: "Flag not found." }, { status: 404 });
  }

  if (existing.status === "ARCHIVED") {
    return NextResponse.json({ message: "Flag is already archived." }, { status: 200 });
  }

  await db.moderation_flags.update({
    where: { id: flagId },
    data: {
      status: "ARCHIVED",
    },
  });

  return NextResponse.json(
    {
      message: "Flag archived successfully.",
    },
    { status: 200 },
  );
}
