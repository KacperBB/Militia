import { db } from "@/lib/db";
import {
  EMAIL_VERIFICATION_DURATION_HOURS,
  EMAIL_VERIFICATION_TOKEN_TYPE,
  PASSWORD_RESET_DURATION_MINUTES,
  PASSWORD_RESET_TOKEN_TYPE,
} from "@/lib/auth/constants";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  normalizeEmail,
  normalizeUsername,
  verifyPassword,
} from "@/lib/auth/crypto";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/auth/mailer";
import {
  DEFAULT_COMPANY_AVATAR_URL,
  DEFAULT_USER_AVATAR_URL,
} from "@/lib/auth/default-avatars";
import { PublicAuthError } from "@/lib/security/auth-errors";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/lib/auth/validators";

function getBaseAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function serializeUser(user: {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  email_verified_at: Date | null;
  company?: {
    id: string;
    name: string;
    nip: string | null;
    city: string | null;
    google_place_id: string | null;
  } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    company: user.company
      ? {
          id: user.company.id,
          name: user.company.name,
          nip: user.company.nip,
          city: user.company.city,
          googlePlaceId: user.company.google_place_id,
        }
      : null,
  };
}

export async function registerUser(
  input: RegisterInput,
  requestMeta: {
    ip?: string;
    userAgent?: string;
  },
) {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);

  const [emailExists, usernameExists] = await Promise.all([
    db.users.findUnique({ where: { email } }),
    db.users.findUnique({ where: { username } }),
  ]);

  if (emailExists) {
    throw new PublicAuthError("Email is already in use.");
  }

  if (usernameExists) {
    throw new PublicAuthError("Username is already in use.");
  }

  const passwordHash = await hashPassword(input.password);
  const rawVerificationToken = generateOpaqueToken(32);
  const verificationTokenHash = hashOpaqueToken(rawVerificationToken);
  const verificationExpiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_DURATION_HOURS * 60 * 60 * 1000,
  );

  const user = await db.$transaction(async (tx) => {
    const createdUser = await tx.users.create({
      data: {
        email,
        username,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        avatar_url: DEFAULT_USER_AVATAR_URL,
        marketing_consent: input.marketingConsent,
      },
    });

    let companyId: string | undefined;

    if (input.accountType === "COMPANY" && input.company) {
      const createdCompany = await tx.companies.create({
        data: {
          name: input.company.name,
          nip: input.company.nip,
          email: input.company.email,
          phone: input.company.phone,
          address: input.company.address,
          zip_code: input.company.zipCode,
          city: input.company.city,
          avatar_url: DEFAULT_COMPANY_AVATAR_URL,
          google_place_id: input.company.googlePlaceId,
          google_maps_url: input.company.googleMapsUrl,
          accepted_terms: input.company.acceptedTerms,
          marketing_consent: input.company.marketingConsent,
          created_by: createdUser.id,
        },
      });

      companyId = createdCompany.id;

      await tx.users.update({
        where: { id: createdUser.id },
        data: {
          company_id: createdCompany.id,
        },
      });
    }

    await tx.user_credentials.create({
      data: {
        user_id: createdUser.id,
        password_hash: passwordHash,
      },
    });

    await tx.verification_tokens.create({
      data: {
        user_id: createdUser.id,
        email,
        token_hash: verificationTokenHash,
        type: EMAIL_VERIFICATION_TOKEN_TYPE,
        expires_at: verificationExpiresAt,
        requested_ip: requestMeta.ip,
        user_agent: requestMeta.userAgent,
      },
    });

    return tx.users.findUniqueOrThrow({
      where: { id: createdUser.id },
      include: {
        company: companyId
          ? true
          : false,
      },
    });
  });

  const verificationUrl = `${getBaseAppUrl()}/auth/verify?token=${rawVerificationToken}`;
  const mailResult = await sendVerificationEmail({
    email,
    username,
    verificationUrl,
  });

  return {
    user: serializeUser(user),
    verification: mailResult,
  };
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashOpaqueToken(token);
  const verificationToken = await db.verification_tokens.findUnique({
    where: {
      token_hash: tokenHash,
    },
    include: {
      user: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!verificationToken) {
    throw new PublicAuthError("Invalid verification token.");
  }

  if (verificationToken.type !== EMAIL_VERIFICATION_TOKEN_TYPE) {
    throw new PublicAuthError("Unsupported verification token type.");
  }

  if (verificationToken.consumed_at) {
    throw new PublicAuthError("Verification token has already been used.");
  }

  if (verificationToken.expires_at < new Date()) {
    throw new PublicAuthError("Verification token has expired.");
  }

  if (!verificationToken.user_id) {
    throw new PublicAuthError("Verification token is invalid.");
  }

  const verificationUserId = verificationToken.user_id;

  const updatedUser = await db.$transaction(async (tx) => {
    await tx.verification_tokens.update({
      where: { id: verificationToken.id },
      data: { consumed_at: new Date() },
    });

    await tx.users.update({
      where: { id: verificationUserId },
      data: { email_verified_at: new Date() },
    });

    return tx.users.findUniqueOrThrow({
      where: { id: verificationUserId },
      include: {
        company: true,
      },
    });
  });

  return serializeUser(updatedUser);
}

export async function loginUser(input: LoginInput) {
  const identifier = input.identifier.trim().toLowerCase();
  const isEmail = identifier.includes("@");

  const user = await db.users.findFirst({
    where: isEmail
      ? { email: identifier }
      : { username: identifier },
    include: {
      credential: true,
      company: true,
    },
  });

  if (!user?.credential) {
    throw new PublicAuthError("Invalid credentials or account is not verified.", 401);
  }

  if (user.status !== "ACTIVE") {
    throw new PublicAuthError("Invalid credentials or account is not verified.", 401);
  }

  if (!user.email_verified_at) {
    throw new PublicAuthError("Invalid credentials or account is not verified.", 401);
  }

  const passwordMatches = await verifyPassword(input.password, user.credential.password_hash);

  if (!passwordMatches) {
    throw new PublicAuthError("Invalid credentials or account is not verified.", 401);
  }

  return serializeUser(user);
}

export async function getSafeUserById(userId: string) {
  const user = await db.users.findUnique({
    where: { id: userId },
    include: {
      company: true,
    },
  });

  return user ? serializeUser(user) : null;
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
  requestMeta: {
    ip?: string;
    userAgent?: string;
  },
) {
  const email = normalizeEmail(input.email);
  const user = await db.users.findUnique({
    where: { email },
    include: {
      credential: true,
    },
  });

  if (!user?.credential || user.status !== "ACTIVE") {
    return {
      delivered: true,
    };
  }

  const rawResetToken = generateOpaqueToken(32);
  const resetTokenHash = hashOpaqueToken(rawResetToken);
  const resetExpiresAt = new Date(Date.now() + PASSWORD_RESET_DURATION_MINUTES * 60 * 1000);

  await db.$transaction(async (tx) => {
    await tx.verification_tokens.deleteMany({
      where: {
        email,
        type: PASSWORD_RESET_TOKEN_TYPE,
        consumed_at: null,
      },
    });

    await tx.verification_tokens.create({
      data: {
        user_id: user.id,
        email,
        token_hash: resetTokenHash,
        type: PASSWORD_RESET_TOKEN_TYPE,
        expires_at: resetExpiresAt,
        requested_ip: requestMeta.ip,
        user_agent: requestMeta.userAgent,
      },
    });
  });

  const resetUrl = `${getBaseAppUrl()}/auth/reset-password?token=${rawResetToken}`;
  const mailResult = await sendPasswordResetEmail({
    email,
    username: user.username ?? user.email,
    resetUrl,
  });

  return {
    delivered: true,
    mail: mailResult,
  };
}

export async function resetPasswordWithToken(input: ResetPasswordInput) {
  const tokenHash = hashOpaqueToken(input.token);
  const resetToken = await db.verification_tokens.findUnique({
    where: {
      token_hash: tokenHash,
    },
  });

  if (!resetToken || resetToken.type !== PASSWORD_RESET_TOKEN_TYPE) {
    throw new PublicAuthError("Invalid or expired reset token.");
  }

  if (resetToken.consumed_at || resetToken.expires_at < new Date() || !resetToken.user_id) {
    throw new PublicAuthError("Invalid or expired reset token.");
  }

  const newPasswordHash = await hashPassword(input.password);
  const resetUserId = resetToken.user_id;

  await db.$transaction(async (tx) => {
    await tx.user_credentials.update({
      where: { user_id: resetUserId },
      data: {
        password_hash: newPasswordHash,
        password_updated_at: new Date(),
      },
    });

    await tx.verification_tokens.update({
      where: { id: resetToken.id },
      data: {
        consumed_at: new Date(),
      },
    });

    // Force re-login everywhere after password reset.
    await tx.user_sessions.deleteMany({
      where: {
        user_id: resetUserId,
      },
    });
  });

  return {
    changed: true,
  };
}
