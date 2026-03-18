import type { NextRequest } from "next/server";

export function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || undefined;
}

export function getRequestUserAgent(request: NextRequest) {
  return request.headers.get("user-agent") ?? undefined;
}

export function getClientFingerprint(request: NextRequest) {
  const ip = getRequestIp(request) ?? "unknown-ip";
  const userAgent = getRequestUserAgent(request) ?? "unknown-ua";
  return `${ip}:${userAgent}`;
}
