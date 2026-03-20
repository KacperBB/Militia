/**
 * Use the __Host- prefix in production to bind the cookie strictly to the
 * origin (https, path=/, no domain attribute).  In development the prefix
 * is omitted so http://localhost still works.
 */
export const AUTH_SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-militia_session"
    : "militia_session";

export const AUTH_GOOGLE_STATE_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-militia_google_state"
    : "militia_google_state";
export const EMAIL_VERIFICATION_TOKEN_TYPE = "EMAIL_VERIFICATION";
export const PASSWORD_RESET_TOKEN_TYPE = "PASSWORD_RESET";
export const SESSION_DURATION_DAYS = 30;
export const EMAIL_VERIFICATION_DURATION_HOURS = 24;
export const PASSWORD_RESET_DURATION_MINUTES = 30;
