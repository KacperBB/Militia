import { NextRequest, NextResponse } from "next/server";

import { lookupBusinesses } from "@/lib/auth/google-business";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("query")?.trim();
    const city = request.nextUrl.searchParams.get("city")?.trim() || undefined;

    if (!query) {
      return NextResponse.json({ message: "Missing query parameter." }, { status: 400 });
    }

    const result = await lookupBusinesses(query, city);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Business lookup failed.";
    return NextResponse.json(
      {
        enabled: false,
        reason: message,
        results: [],
      },
      { status: 200 },
    );
  }
}
