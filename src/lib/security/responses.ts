import { NextResponse } from "next/server";

const API_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  "Surrogate-Control": "no-store",
};

export function badRequest(message = "Invalid request.") {
  return NextResponse.json({ message }, { status: 400, headers: API_NO_STORE_HEADERS });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { message: "Too many attempts. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        ...API_NO_STORE_HEADERS,
      },
    },
  );
}

export function unauthorized(message = "Authentication failed.") {
  return NextResponse.json({ message }, { status: 401, headers: API_NO_STORE_HEADERS });
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: API_NO_STORE_HEADERS });
}
