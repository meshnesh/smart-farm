import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = (searchParams.get("location") ?? "").trim();
  if (!location) {
    return NextResponse.json({ error: "Missing location" }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENWEATHER_API_KEY" }, { status: 500 });
  }

  // 1) Geocode location -> lat/lon
  const geoUrl = new URL("https://api.openweathermap.org/geo/1.0/direct");
  geoUrl.searchParams.set("q", location);
  geoUrl.searchParams.set("limit", "1");
  geoUrl.searchParams.set("appid", apiKey);

  const geoRes = await fetch(geoUrl.toString(), { cache: "no-store" });
  if (!geoRes.ok) {
    return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
  }

  const geoJson: any[] = await geoRes.json();
  const g = geoJson?.[0];
  if (!g?.lat || !g?.lon) {
    return NextResponse.json({ error: "Could not geocode location" }, { status: 404 });
  }

  // 2) Current weather
  const wUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
  wUrl.searchParams.set("lat", String(g.lat));
  wUrl.searchParams.set("lon", String(g.lon));
  wUrl.searchParams.set("units", "metric");
  wUrl.searchParams.set("appid", apiKey);

  const wRes = await fetch(wUrl.toString(), { cache: "no-store" });
  if (!wRes.ok) {
    return NextResponse.json({ error: "Weather provider error" }, { status: 502 });
  }

  const w: any = await wRes.json();

  // Precip (mm) — OpenWeather may return rain/snow volumes
  const rainMm =
    typeof w?.rain?.["1h"] === "number"
      ? w.rain["1h"]
      : typeof w?.rain?.["3h"] === "number"
      ? w.rain["3h"]
      : 0;

  const snowMm =
    typeof w?.snow?.["1h"] === "number"
      ? w.snow["1h"]
      : typeof w?.snow?.["3h"] === "number"
      ? w.snow["3h"]
      : 0;

  return NextResponse.json({
    location: `${g.name}${g.country ? `, ${g.country}` : ""}`,
    tempC: typeof w?.main?.temp === "number" ? w.main.temp : null,
    humidity: typeof w?.main?.humidity === "number" ? w.main.humidity : null,
    precipitationMm: rainMm + snowMm,
    description: w?.weather?.[0]?.description ?? null,
    asOf: typeof w?.dt === "number" ? new Date(w.dt * 1000).toISOString() : null,
  });
}