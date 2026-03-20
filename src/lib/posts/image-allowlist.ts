/**
 * CDN image URL allow-list for post listings.
 *
 * Only URLs from known, trusted upload-CDN hosts are accepted.
 * This prevents SSRF, open-redirect via image URL, and the
 * display of arbitrary third-party images under the platform brand.
 */

const ALLOWED_EXACT_HOSTS = new Set(["utfs.io", "ufs.sh"]);
const ALLOWED_SUFFIX_HOSTS = [".ufs.sh", ".uploadthing.com"];

export function isAllowedImageUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();

  if (ALLOWED_EXACT_HOSTS.has(host)) return true;

  for (const suffix of ALLOWED_SUFFIX_HOSTS) {
    if (host.endsWith(suffix)) return true;
  }

  return false;
}

/** Human-readable list of allowed hosts, used in Zod error messages. */
export const ALLOWED_IMAGE_HOSTS_LABEL =
  "utfs.io, *.ufs.sh, *.uploadthing.com (https only)";
