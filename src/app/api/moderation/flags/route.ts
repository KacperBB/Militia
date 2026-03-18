import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertJsonRequest, isTrustedOrigin } from "@/lib/security/http";
import { badRequest, unauthorized } from "@/lib/security/responses";

const createFlagSchema = z.object({
  targetType: z.enum(["USER", "POST"]),
  targetId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  reason: z.string().trim().min(2).max(100),
  details: z.string().trim().max(1500).optional(),
});

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return badRequest("Untrusted origin.");
  }

  if (!assertJsonRequest(request)) {
    return badRequest("Content-Type must be application/json.");
  }

  const session = await getCurrentSession();

  if (!session) {
    return unauthorized("You must be logged in.");
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ message: "Account is not active." }, { status: 403 });
  }

  if (!session.user.email_verified_at) {
    return NextResponse.json({ message: "Only verified users can submit reports." }, { status: 403 });
  }

  const body = await request.json();
  const input = createFlagSchema.parse(body);

  const created = await db.moderation_flags.create({
    data: {
      target_type: input.targetType,
      target_id: input.targetId,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
      reason: input.reason,
      details: input.details,
      created_by: session.user.id,
      status: "OPEN",
    },
    select: {
      id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
    },
  });

  return NextResponse.json(
    {
      message: "Report submitted successfully.",
      flag: created,
    },
    { status: 201 },
  );
}
