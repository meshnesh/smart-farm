"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { MoistureArea, TempArea } from "@/components/Charts";
import { getCurrentFarmId, setCurrentFarmId } from "@/lib/session";
import {
  listFarms,
  subscribeSensors,
  subscribeSensorSeries24h,
  type ReadingPoint,
} from "@/lib/data";
import type { Sensor } from "@/lib/types";
import { Thermometer, Droplets, CloudRain, MapPin, Lightbulb } from "lucide-react";
import { DBG } from "@/lib/debug";

function soilLabelFromAvg(avg: number | null) {
  if (avg === null) return { label: "—", desc: "No data yet.", tone: "default" as const };
  if (avg >= 70) return { label: "Excellent", desc: "Soil moisture is healthy. Maintain consistent watering.", tone: "good" as const };
  if (avg >= 45) return { label: "Good", desc: "Moisture looks okay. Monitor trend and weather.", tone: "good" as const };
  if (avg >= 25) return { label: "Fair", desc: "Moisture is getting low. Consider watering soon.", tone: "warn" as const };
  return { label: "Dry", desc: "Soil is too dry. Water recommended.", tone: "bad" as const };
}

function StatTile({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneCls =
    tone === "good"
      ? "bg-emerald-50 border-emerald-200"
      : tone === "warn"
      ? "bg-amber-50 border-amber-200"
      : tone === "bad"
      ? "bg-rose-50 border-rose-200"
      : "bg-white";

  const iconCls =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
      ? "text-amber-700"
      : tone === "bad"
      ? "text-rose-700"
      : "text-gray-700";

  return (
    <div className={`rounded-2xl border p-4 ${toneCls}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-600">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
          {sub ? <div className="mt-1 text-sm text-gray-600">{sub}</div> : null}
        </div>
        <div className={`mt-1 ${iconCls}`}>{icon}</div>
      </div>
    </div>
  );
}

type WeatherInfo = {
  location: string;
  tempC: number | null;
  humidity: number | null;
  precipitationMm: number | null;
  description?: string | null;
  asOf?: string | null;
  error?: string;
};

function getAdvice(input: {
  avgMoisture: number | null;
  precipitationMm: number | null;
  humidity: number | null;
}) {
  const { avgMoisture, precipitationMm, humidity } = input;

  const isWetNow = typeof precipitationMm === "number" && precipitationMm >= 1.0;
  const isHeavyRain = typeof precipitationMm === "number" && precipitationMm >= 5.0;
  const isDrySoil = typeof avgMoisture === "number" && avgMoisture < 25;
  const isOkaySoil = typeof avgMoisture === "number" && avgMoisture >= 25 && avgMoisture < 45;
  const isGoodSoil = typeof avgMoisture === "number" && avgMoisture >= 45;

  if (avgMoisture == null && precipitationMm == null) {
    return {
      message:
        "Not enough data yet. Once readings and weather are available, we’ll suggest actions here.",
      tone: "default" as const,
      bullets: ["Ensure sensors are reporting.", "Confirm farm location is set correctly."],
    };
  }
  if (isHeavyRain) {
    return {
      message: "Heavy rain detected. Hold off watering and check drainage / flooding risk.",
      tone: "warn" as const,
      bullets: ["Inspect low points and drains.", "Delay irrigation until soil stabilizes."],
    };
  }
  if (isWetNow) {
    return {
      message: "Rain detected. Avoid watering for now and re-check moisture later.",
      tone: "good" as const,
      bullets: ["Re-check in a few hours.", "Watch for over-saturation in clay soils."],
    };
  }
  if (isDrySoil) {
    return {
      message: "Soil looks dry and no rain detected. Water today, then monitor the next reading.",
      tone: "bad" as const,
      bullets: ["Irrigate in the morning/evening.", "Check for leaks or blocked lines."],
    };
  }
  if (isOkaySoil) {
    return {
      message:
        "Moisture is moderate. Consider a light watering if your crop is sensitive to dryness.",
      tone: "warn" as const,
      bullets: [
        `Humidity ${typeof humidity === "number" ? `is ${humidity}%` : "is not available"} — adjust watering if winds are high.`,
        "Watch the moisture trend over the next readings.",
      ],
    };
  }
  if (isGoodSoil) {
    return {
      message: "Moisture looks good. Maintain schedule and monitor for any sudden drops.",
      tone: "good" as const,
      bullets: ["No urgent action needed.", "Compare zones to spot uneven watering."],
    };
  }
  return {
    message: "Monitor conditions and adjust irrigation based on your crop and soil type.",
    tone: "default" as const,
    bullets: ["Track trend changes.", "Compare zones to spot uneven watering."],
  };
}

function isAuthishError(err: any) {
  const code = err?.code ?? "";
  const msg = String(err?.message ?? "");
  return (
    code === "permission-denied" ||
    code === "unauthenticated" ||
    code === "auth/not-signed-in" ||
    msg.toLowerCase().includes("not signed in") ||
    msg.toLowerCase().includes("permission") ||
    msg.toLowerCase().includes("unauth")
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [farmId, setFarmId] = useState<string | null>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [zone, setZone] = useState<string>("All zones");
  const [series, setSeries] = useState<ReadingPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const handleAuthError = (err: any) => {
    if (isAuthishError(err)) {
      DBG("Dashboard: auth-ish error -> redirect /login", { code: err?.code, message: err?.message });
      router.replace("/login");
      return true;
    }
    return false;
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        DBG("Dashboard: loading farms", { storedFarmId: getCurrentFarmId() });

        const all = await listFarms();
        if (cancelled) return;

        DBG("Dashboard: listFarms returned", {
          count: all?.length ?? 0,
          ids: (all ?? []).map((f: any) => f.id),
        });

        if (!all?.length) {
          DBG("Dashboard: no farms -> redirect /login");
          router.replace("/login");
          return;
        }

        setFarms(all);

        const preferred = getCurrentFarmId();
        const isValid = preferred ? all.some((f: any) => f.id === preferred) : false;
        const resolved = isValid ? preferred : all[0]?.id ?? null;

        DBG("Dashboard: resolve farm", { preferred, isValid, resolved });

        if (resolved && resolved !== preferred) {
          DBG("Dashboard: persisting resolved farmId", { resolved });
          setCurrentFarmId(resolved);
          DBG("Dashboard: storedFarmId now", { stored: getCurrentFarmId() });
        }

        setFarmId(resolved);
      } catch (e: any) {
        if (cancelled) return;
        DBG("Dashboard: farms load ERROR", { message: e?.message, code: e?.code, e });
        if (handleAuthError(e)) return;
        setError(e?.message ?? "Failed to load farms");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const farm = useMemo(() => {
    if (!farms.length) return null;
    return farms.find((f) => f.id === farmId) ?? farms[0] ?? null;
  }, [farms, farmId]);

  const farmLocation = (farm?.location ?? "").trim();

  useEffect(() => {
    if (!farmId) return;

    DBG("Dashboard: subscribeSensors start", { farmId });

    setError(null);
    setSensors([]);

    const unsub = subscribeSensors(
      farmId,
      (rows) => {
        DBG("Dashboard: subscribeSensors data", { farmId, count: rows?.length ?? 0 });
        setSensors(rows as any);
      },
      (err) => {
        DBG("Dashboard: subscribeSensors error", {
          farmId,
          code: err?.code,
          message: err?.message,
          err,
        });

        if (handleAuthError(err)) return;
        setError(err?.message ?? String(err));
      }
    );

    return () => {
      DBG("Dashboard: subscribeSensors unsub", { farmId });
      unsub();
    };
  }, [farmId]);

  useEffect(() => {
    if (!farmLocation) {
      setWeather(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setWeatherLoading(true);
        const res = await fetch(`/api/weather?location=${encodeURIComponent(farmLocation)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as WeatherInfo;
        if (cancelled) return;

        if (!res.ok) {
          setWeather({
            location: farmLocation,
            tempC: null,
            humidity: null,
            precipitationMm: null,
            error: (json as any)?.error || "Weather error",
          });
          return;
        }

        setWeather(json);
      } catch {
        if (!cancelled) {
          setWeather({
            location: farmLocation,
            tempC: null,
            humidity: null,
            precipitationMm: null,
            error: "Weather request failed",
          });
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [farmLocation]);

  const zones = useMemo(() => {
    const z = Array.from(new Set((sensors ?? []).map((s: any) => s.zone ?? "Unassigned")));
    z.sort((a: string, b: string) => a.localeCompare(b));
    return ["All zones", ...z];
  }, [sensors]);

  const filteredSensors = useMemo(() => {
    if (zone === "All zones") return sensors;
    return sensors.filter((s: any) => (s.zone ?? "Unassigned") === zone);
  }, [sensors, zone]);

  const kpi = useMemo(() => {
    const online = filteredSensors.filter((s: any) => s.status === "online").length;
    const warning = filteredSensors.filter((s: any) => s.status === "warning").length;
    const offline = filteredSensors.filter((s: any) => s.status === "offline").length;

    const moistVals = filteredSensors
      .map((s: any) => s.latest?.soilMoisture)
      .filter((v: any): v is number => typeof v === "number");

    const avgMoisture = moistVals.length
      ? Math.round((moistVals.reduce((a: number, b: number) => a + b, 0) / moistVals.length) * 10) / 10
      : null;

    return { online, warning, offline, avgMoisture };
  }, [filteredSensors]);

  const primarySensorId = useMemo(() => {
    const candidate: any = filteredSensors[0] ?? sensors[0];
    return candidate?.id ?? null;
  }, [filteredSensors, sensors]);

  useEffect(() => {
    if (!primarySensorId) {
      DBG("Dashboard: no primarySensorId -> clear series");
      setSeries([]);
      return;
    }

    DBG("Dashboard: subscribeSensorSeries24h start", { primarySensorId });

    const unsub = subscribeSensorSeries24h(
      primarySensorId,
      (pts) => {
        DBG("Dashboard: subscribeSensorSeries24h data", { primarySensorId, count: pts?.length ?? 0 });
        setSeries(pts);
      },
      (err) => {
        DBG("Dashboard: subscribeSensorSeries24h error", {
          primarySensorId,
          code: err?.code,
          message: err?.message,
          err,
        });

        if (handleAuthError(err)) return;
        setSeries([]);
      },
      48
    );

    return () => {
      DBG("Dashboard: subscribeSensorSeries24h unsub", { primarySensorId });
      unsub();
    };
  }, [primarySensorId]);

  const moistureChart = useMemo(
    () => series.map((p) => ({ hour: p.label, moisture: p.moisture })),
    [series]
  );

  const tempChart = useMemo(
    () => series.map((p) => ({ label: p.label, tempC: p.tempC })),
    [series]
  );

  const moistureSummary = useMemo(() => {
    const vals = series.map((p) => p.moisture).filter((v) => typeof v === "number" && isFinite(v));
    if (!vals.length) return { min: null as number | null, avg: null as number | null, max: null as number | null };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const round1 = (x: number) => Math.round(x * 10) / 10;
    return { min: round1(min), avg: round1(avg), max: round1(max) };
  }, [series]);

  const soil = useMemo(() => soilLabelFromAvg(moistureSummary.avg), [moistureSummary.avg]);

  const advice = useMemo(() => {
    return getAdvice({
      avgMoisture: moistureSummary.avg,
      precipitationMm: typeof weather?.precipitationMm === "number" ? weather.precipitationMm : null,
      humidity: typeof weather?.humidity === "number" ? weather.humidity : null,
    });
  }, [moistureSummary.avg, weather?.precipitationMm, weather?.humidity]);

  return (
    <PageShell>
      <Topbar title={farm?.farmName ?? farm?.name ?? "Dashboard"} />

      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-600">{farm?.location ?? "—"}</div>
            <div className="text-xl font-semibold">Farm Overview</div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/select-farm"
              className="rounded-2xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Switch
            </Link>

            <Link
              href="/farms/new"
              className="rounded-2xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              + Add farm
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
            <div className="font-semibold">Couldn’t load dashboard</div>
            <div className="text-sm opacity-80">{error}</div>
            <div className="mt-2 text-xs text-rose-900/70">
              If this keeps happening after being idle, it’s usually an expired session — you’ll be redirected to login.
            </div>
          </div>
        ) : null}

        <Card>
          <CardHeader title="Weather" right={<span className="text-xs text-gray-500">live</span>} />
          <CardBody>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{farm?.location ?? "—"}</span>
              {weather?.asOf ? (
                <span className="text-xs text-gray-500">
                  • Updated {new Date(weather.asOf).toLocaleTimeString()}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatTile
                icon={<Thermometer className="h-6 w-6" />}
                label="Temperature"
                value={
                  weatherLoading ? "…" : typeof weather?.tempC === "number" ? `${weather.tempC.toFixed(1)}°C` : "—"
                }
                sub={weatherLoading ? "" : (weather?.description ?? "")}
                tone={typeof weather?.tempC === "number" ? "good" : "default"}
              />

              <StatTile
                icon={<Droplets className="h-6 w-6" />}
                label="Humidity"
                value={weatherLoading ? "…" : typeof weather?.humidity === "number" ? `${weather.humidity}%` : "—"}
                tone={typeof weather?.humidity === "number" ? (weather.humidity >= 70 ? "warn" : "good") : "default"}
              />

              <StatTile
                icon={<CloudRain className="h-6 w-6" />}
                label="Precipitation"
                value={
                  weatherLoading
                    ? "…"
                    : typeof weather?.precipitationMm === "number"
                    ? `${weather.precipitationMm.toFixed(1)} mm`
                    : "—"
                }
                sub={!weatherLoading && weather?.error ? `(${weather.error})` : undefined}
                tone={
                  typeof weather?.precipitationMm === "number"
                    ? weather.precipitationMm > 5
                      ? "warn"
                      : "good"
                    : "default"
                }
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Advice"
            right={
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Lightbulb className="h-4 w-4" /> auto
              </span>
            }
          />
          <CardBody>
            <div
              className={[
                "rounded-2xl border p-4",
                advice.tone === "good"
                  ? "bg-emerald-50 border-emerald-200"
                  : advice.tone === "warn"
                  ? "bg-amber-50 border-amber-200"
                  : advice.tone === "bad"
                  ? "bg-rose-50 border-rose-200"
                  : "bg-white border-gray-200",
              ].join(" ")}
            >
              <div className="font-semibold text-gray-900">{advice.message}</div>
              {advice.bullets?.length ? (
                <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {advice.bullets.map((b: string, i: number) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 text-xs text-gray-500">
                Based on the last 24h moisture trend + current weather for the farm location.
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Zones" />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {zones.map((z) => (
                <button
                  key={z}
                  onClick={() => setZone(z)}
                  className={[
                    "rounded-full px-3 py-1 text-sm font-medium border",
                    zone === z
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white hover:bg-gray-50",
                  ].join(" ")}
                >
                  {z}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Online" value={`${kpi.online}`} hint="Sensors active" tone="good" />
          <KpiCard title="Warning" value={`${kpi.warning}`} hint="Needs attention" tone="warn" />
          <KpiCard title="Offline" value={`${kpi.offline}`} hint="Not reporting" tone="bad" />
          <KpiCard
            title="Avg Moisture"
            value={kpi.avgMoisture === null ? "—" : `${kpi.avgMoisture}%`}
            hint="Across sensors"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Soil Status" />
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{soil.label}</div>
                  <div className="mt-1 text-sm text-gray-600">{soil.desc}</div>
                </div>
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold border",
                    soil.tone === "good"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : soil.tone === "warn"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : soil.tone === "bad"
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-gray-50 border-gray-200 text-gray-700",
                  ].join(" ")}
                >
                  AI
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Moisture Summary" right={<span className="text-xs text-gray-500">last 24h</span>} />
            <CardBody>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border p-3">
                  <div className="text-xs text-gray-500">Min</div>
                  <div className="text-lg font-semibold">
                    {moistureSummary.min === null ? "—" : `${moistureSummary.min}%`}
                  </div>
                </div>
                <div className="rounded-2xl border p-3">
                  <div className="text-xs text-gray-500">Avg</div>
                  <div className="text-lg font-semibold">
                    {moistureSummary.avg === null ? "—" : `${moistureSummary.avg}%`}
                  </div>
                </div>
                <div className="rounded-2xl border p-3">
                  <div className="text-xs text-gray-500">Max</div>
                  <div className="text-lg font-semibold">
                    {moistureSummary.max === null ? "—" : `${moistureSummary.max}%`}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Moisture Trend" right={<span className="text-xs text-gray-500">Realtime</span>} />
            <CardBody>
              <MoistureArea data={moistureChart.length ? moistureChart : [{ hour: "—", moisture: 0 }]} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Temperature" right={<span className="text-xs text-gray-500">Realtime</span>} />
            <CardBody>
              <TempArea data={tempChart.length ? tempChart : [{ label: "—", tempC: 0 }]} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Sensors"
            right={
              <Link href="/sensors" className="text-sm font-medium text-emerald-700 hover:underline">
                View all
              </Link>
            }
          />
          <CardBody>
            <div className="grid gap-3">
              {filteredSensors.slice(0, 4).map((s: any) => (
                <Link
                  key={s.id}
                  href={`/sensors/${encodeURIComponent(s.id)}`}
                  className="rounded-2xl border p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "h-3 w-3 rounded-full",
                        s.status === "online"
                          ? "bg-emerald-600"
                          : s.status === "warning"
                          ? "bg-amber-500"
                          : "bg-rose-500",
                      ].join(" ")}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-sm text-gray-600">
                        {(s.zone ?? "Unassigned")} • Last seen {s.lastSeen}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {String(s.type ?? "UNKNOWN").toUpperCase()}
                    </div>
                  </div>
                </Link>
              ))}

              {!filteredSensors.length ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  <div className="font-semibold">No sensors</div>
                  <div className="mt-1 text-sm text-gray-600">
                    Try switching zones or adding a sensor.
                  </div>
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}