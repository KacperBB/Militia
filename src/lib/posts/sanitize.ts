/**
 * Shared text-sanitization helpers used by post create and edit routes.
 * Strips control characters and normalises whitespace so that neither
 * raw NUL bytes nor invisible formatting tricks reach the database.
 */

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Single-line fields: collapse all whitespace runs to a single space. */
export function sanitizeSingleLine(value: string): string {
  return value.replace(CONTROL_CHARS_RE, "").replace(/\s+/g, " ").trim();
}

/** Multi-line fields (descriptions): normalise CRLF and collapse triple+ newlines. */
export function sanitizeMultiline(value: string): string {
  return value
    .replace(CONTROL_CHARS_RE, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
