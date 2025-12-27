"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { KpiCard } from "@/components/KpiCard";
import { MoistureArea, TempArea } from "@/components/Charts";
import { getCurrentFarmId } from "@/lib/session";
import { subscribeSensors, subscribeSensorSeries24h, type ReadingPoint } from "@/lib/data";
import type { Sensor } from "@/lib/types";

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

export default function SensorDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [series, setSeries] = useState<ReadingPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAuthError = (err: any) => {
    if (isAuthishError(err)) {
      router.replace("/login");
      return true;
    }
    return false;
  };

  // If there is no farm selected in session, go select farm (or login depending on your flow)
  useEffect(() => {
    const farmId = getCurrentFarmId();
    if (!farmId) {
      router.replace("/select-farm");
    }
  }, [router]);

  // Realtime sensor doc via farm sensors subscription
  useEffect(() => {
    const farmId = getCurrentFarmId();
    if (!farmId) return;

    setError(null);

    const unsub = subscribeSensors(
      farmId,
      (all) => {
        const found = (all as any[]).find((s) => s.id === id) ?? null;
        setSensor(found);
      },
      (err) => {
        if (handleAuthError(err)) return;
        setError(err?.message ?? String(err));
      }
    );

    return () => unsub();
  }, [id]);

  // Realtime readings series
  useEffect(() => {
    const unsub = subscribeSensorSeries24h(
      id,
      (pts) => setSeries(pts),
      (err) => {
        if (handleAuthError(err)) return;
        setError(err?.message ?? String(err));
      },
      48
    );

    return () => unsub();
  }, [id]);

  const tone = useMemo(() => {
    if (!sensor) return "default" as const;
    return sensor.status === "online" ? ("good" as const) : sensor.status === "warning" ? ("warn" as const) : ("bad" as const);
  }, [sensor]);

  const moistureChart = useMemo(() => series.map((p) => ({ hour: p.label, moisture: p.moisture })), [series]);
  const tempChart = useMemo(() => series.map((p) => ({ label: p.label, tempC: p.tempC })), [series]);

  return (
    <PageShell>
      <Topbar title="Sensor Details" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/sensors" className="text-sm font-medium text-emerald-700 hover:underline">
            ← Sensors
          </Link>
          <span className="text-xs text-gray-500">ID: {id}</span>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
            <div className="font-semibold">Couldn’t load sensor</div>
            <div className="text-sm opacity-80">{error}</div>
            <div className="mt-2 text-xs text-rose-900/70">
              If this happened after being idle, your session may have expired — you’ll be redirected to login.
            </div>
          </div>
        ) : null}

        <Card>
          <CardHeader title={sensor ? sensor.name : id} />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                title="Status"
                value={sensor?.status?.toUpperCase() ?? "—"}
                hint={`Last seen ${sensor?.lastSeen ?? "—"}`}
                tone={tone}
              />
              <KpiCard title="Zone" value={sensor?.zone ?? "Unassigned"} />
              <KpiCard title="Type" value={sensor?.type?.toUpperCase() ?? "—"} />
              <KpiCard
                title="Moisture"
                value={typeof (sensor as any)?.latest?.soilMoisture === "number" ? `${(sensor as any).latest.soilMoisture.toFixed(1)}%` : "—"}
                hint="Latest reading"
              />
            </div>
          </CardBody>
        </Card>

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
          <CardHeader title="Actions" />
          <CardBody>
            <div className="grid md:grid-cols-3 gap-3">
              <button className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                <div className="font-semibold">Calibrate</div>
                <div className="text-sm text-gray-600">Adjust baselines & offsets</div>
              </button>
              <button className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                <div className="font-semibold">Set thresholds</div>
                <div className="text-sm text-gray-600">Configure alerts</div>
              </button>
              <button className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                <div className="font-semibold">Maintenance log</div>
                <div className="text-sm text-gray-600">Track repairs and checks</div>
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}