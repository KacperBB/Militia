import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { toPublicAuthError } from "@/lib/security/auth-errors";
import { assertJsonRequest, isTrustedOrigin } from "@/lib/security/http";
import { badRequest, ok, unauthorized } from "@/lib/security/responses";

const optionalString = z.string().trim().max(255).optional();

const settingsSchema = z.object({
  user: z
    .object({
      username: z
        .string()
        .trim()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9._-]+$/, "Username can contain only letters, numbers, dots, underscores, and dashes."),
      firstName: optionalString,
      lastName: optionalString,
      phone: optionalString,
      avatarUrl: optionalString,
      marketingConsent: z.boolean(),
    })
    .partial()
    .optional(),
  company: z
    .object({
      name: optionalString,
      nip: optionalString,
      email: z.string().trim().email().optional(),
      phone: optionalString,
      address: optionalString,
      zipCode: optionalString,
      city: optionalString,
      description: z.string().trim().max(2000).optional(),
      avatarUrl: optionalString,
      marketingConsent: z.boolean().optional(),
    })
    .partial()
    .nullable()
    .optional(),
});

function normalizeString(value?: string) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNonNullableString(value?: string) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return unauthorized("You must be logged in.");
  }

  return ok({
    user: {
      username: session.user.username,
      firstName: session.user.first_name,
      lastName: session.user.last_name,
      phone: session.user.phone,
      avatarUrl: session.user.avatar_url,
      marketingConsent: session.user.marketing_consent,
    },
    company: session.user.company
      ? {
          name: session.user.company.name,
          nip: session.user.company.nip,
          email: session.user.company.email,
          phone: session.user.company.phone,
          address: session.user.company.address,
          zipCode: session.user.company.zip_code,
          city: session.user.company.city,
          description: session.user.company.description,
          avatarUrl: session.user.company.avatar_url,
          marketingConsent: session.user.company.marketing_consent,
        }
      : null,
  });
}

export async function PATCH(request: NextRequest) {
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

  try {
    const payload = await request.json();
    const input = settingsSchema.parse(payload);

    if (input.user) {
      await db.users.update({
        where: { id: session.user.id },
        data: {
          username: input.user.username,
          first_name:
            input.user.firstName !== undefined ? normalizeString(input.user.firstName) : undefined,
          last_name:
            input.user.lastName !== undefined ? normalizeString(input.user.lastName) : undefined,
          phone: input.user.phone !== undefined ? normalizeString(input.user.phone) : undefined,
          avatar_url:
            input.user.avatarUrl !== undefined ? normalizeString(input.user.avatarUrl) : undefined,
          marketing_consent: input.user.marketingConsent,
        },
      });
    }

    if (input.company !== undefined && input.company !== null) {
      if (!session.user.company_id) {
        return badRequest("Company settings are not available for this account.");
      }

      await db.companies.update({
        where: { id: session.user.company_id },
        data: {
          name:
            input.company.name !== undefined
              ? normalizeNonNullableString(input.company.name)
              : undefined,
          nip: input.company.nip !== undefined ? normalizeString(input.company.nip) : undefined,
          email:
            input.company.email !== undefined ? normalizeString(input.company.email) : undefined,
          phone:
            input.company.phone !== undefined ? normalizeString(input.company.phone) : undefined,
          address:
            input.company.address !== undefined
              ? normalizeString(input.company.address)
              : undefined,
          zip_code:
            input.company.zipCode !== undefined
              ? normalizeString(input.company.zipCode)
              : undefined,
          city: input.company.city !== undefined ? normalizeString(input.company.city) : undefined,
          description:
            input.company.description !== undefined
              ? normalizeString(input.company.description)
              : undefined,
          avatar_url:
            input.company.avatarUrl !== undefined
              ? normalizeString(input.company.avatarUrl)
              : undefined,
          marketing_consent: input.company.marketingConsent,
        },
      });
    }

    return ok({ message: "Settings updated successfully." });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "One of the unique fields is already in use." },
        { status: 400 },
      );
    }

    const publicError = toPublicAuthError(error);
    return NextResponse.json({ message: publicError.message }, { status: publicError.status });
  }
}
