import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const lang = request.nextUrl.searchParams.get("lang") ?? "pl";

  if (!lat || !lng) {
    return NextResponse.json({ error: "missing lat or lng" }, { status: 400 });
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return NextResponse.json({ error: "invalid lat or lng" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", latNum.toString());
  url.searchParams.set("lon", lngNum.toString());
  url.searchParams.set("zoom", "18");
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
