import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

// ---------------------------------------------------------------------------
// Shared validators
// ---------------------------------------------------------------------------

/**
 * Polish NIP (tax identification number) checksum validation.
 * Weights: [6,5,7,2,3,4,5,6,7]. Weighted sum mod 11 must equal the 10th digit.
 * A result of 10 means the NIP is structurally invalid.
 */
export function validateNip(raw: string): boolean {
  const cleaned = raw.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(cleaned)) return false;
  const digits = cleaned.split("").map(Number);
  // First digit of a real Polish NIP is always 1–9 (no leading zero)
  if (digits[0] === 0) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i]!, 0);
  const control = sum % 11;
  return control < 10 && control === digits[9];
}

/**
 * A phone number must contain at least 7 digit characters.
 * This prevents strings like "(   )   " from passing the character-class regex.
 */
export function hasEnoughPhoneDigits(phone: string): boolean {
  return (phone.match(/\d/g) ?? []).length >= 7;
}

const nipSchema = z
  .string()
  .trim()
  .min(10)
  .max(13) // with optional separators
  .refine(validateNip, "Invalid NIP checksum.")
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(40)
  .regex(/^[0-9+\-\s()]{7,40}$/, "Invalid phone number format.")
  .refine(hasEnoughPhoneDigits, "Phone number must contain at least 7 digits.")
  .optional();

export const registerSchema = z
  .object({
    accountType: z.enum(["PRIVATE", "COMPANY"]),
    email: z.string().trim().email().max(254),
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9._-]+$/, "Username can contain only letters, numbers, dots, underscores, and dashes."),
    firstName: z.string().trim().max(100).transform((v) => v || undefined).optional(),
    lastName: z.string().trim().max(100).transform((v) => v || undefined).optional(),
    phone: phoneSchema,
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one digit."),
    confirmPassword: z.string(),
    marketingConsent: z.boolean().default(false),
    company: z
      .object({
        name: z.string().trim().min(2).max(200),
        nip: nipSchema,
        email: z.string().trim().email().max(254).transform((v) => v || undefined).optional(),
        phone: phoneSchema,
        address: z.string().trim().max(300).transform((v) => v || undefined).optional(),
        zipCode: z
          .string()
          .trim()
          .max(20)
          .regex(/^[0-9A-Za-z\s-]{2,20}$/, "Invalid zip code format.")
          .transform((v) => v || undefined)
          .optional(),
        city: z.string().trim().max(120).transform((v) => v || undefined).optional(),
        googlePlaceId: z.string().trim().max(300).transform((v) => v || undefined).optional(),
        googleMapsUrl: z
          .string()
          .trim()
          .url("Must be a valid URL.")
          .max(500)
          .refine(
            (url) => {
              try {
                const { protocol, hostname } = new URL(url);
                if (protocol !== "https:") return false;
                return (
                  hostname === "maps.google.com" ||
                  hostname === "www.google.com" ||
                  hostname === "www.google.pl" ||
                  hostname === "maps.app.goo.gl" ||
                  hostname === "goo.gl"
                );
              } catch {
                return false;
              }
            },
            "Must be a secure Google Maps URL (https only).",
          )
          .transform((v) => v || undefined)
          .optional(),
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
