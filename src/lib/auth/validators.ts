import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const registerSchema = z
  .object({
    accountType: z.enum(["PRIVATE", "COMPANY"]),
    email: z.string().trim().email(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9._-]+$/, "Username can contain only letters, numbers, dots, underscores, and dashes."),
    firstName: optionalTrimmedString,
    lastName: optionalTrimmedString,
    phone: optionalTrimmedString,
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one digit."),
    confirmPassword: z.string(),
    marketingConsent: z.boolean().default(false),
    company: z
      .object({
        name: z.string().trim().min(2),
        nip: optionalTrimmedString,
        email: optionalTrimmedString,
        phone: optionalTrimmedString,
        address: optionalTrimmedString,
        zipCode: optionalTrimmedString,
        city: optionalTrimmedString,
        googlePlaceId: optionalTrimmedString,
        googleMapsUrl: optionalTrimmedString,
        acceptedTerms: z.boolean(),
        marketingConsent: z.boolean().default(false),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }

    if (data.accountType === "COMPANY" && !data.company) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["company"],
        message: "Company details are required for company registration.",
      });
    }

    if (data.accountType === "COMPANY" && data.company && !data.company.acceptedTerms) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["company", "acceptedTerms"],
        message: "Company account requires accepted terms.",
      });
    }
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(8),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(16),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(16),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one digit."),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
