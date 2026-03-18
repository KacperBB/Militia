import { ZodError } from "zod";

export class PublicAuthError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function toPublicAuthError(error: unknown) {
  if (error instanceof PublicAuthError) {
    return error;
  }

  if (error instanceof ZodError) {
    const issues = error.issues;
    if (issues.length > 0) {
      const firstIssue = issues[0];
      const fieldPath = firstIssue.path.join(".");
      const message = firstIssue.message;
      return new PublicAuthError(
        fieldPath ? `${fieldPath}: ${message}` : message,
        400
      );
    }
    return new PublicAuthError("Invalid request payload.", 400);
  }

  return new PublicAuthError("Operation failed.", 400);
}
