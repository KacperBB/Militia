import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const lang = request.nextUrl.searchParams.get("lang") ?? "pl";

  if (!q) {
    return NextResponse.json({ error: "missing q" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "pl");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      "Accept-Language": lang === "en" ? "en" : "pl,en;q=0.8",
      "User-Agent": "MilitiaApp/1.0 (contact@militia.pl)",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
