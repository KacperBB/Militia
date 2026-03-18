import { NextResponse } from "next/server";

export function badRequest(message = "Invalid request.") {
  return NextResponse.json({ message }, { status: 400 });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { message: "Too many attempts. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export function unauthorized(message = "Authentication failed.") {
  return NextResponse.json({ message }, { status: 401 });
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
