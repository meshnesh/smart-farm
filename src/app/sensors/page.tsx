"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { getCurrentFarmId } from "@/lib/session";
import { listSensors } from "@/lib/data";
import { farms } from "@/lib/mock";
import type { Sensor } from "@/lib/types";

export default function SensorsPage() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [farmId, setFarmId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const id = getCurrentFarmId() ?? farms[0].id;
        if (!mounted) return;
        setFarmId(id);

        const rows = await listSensors(id);
        if (!mounted) return;
        setSensors(rows as Sensor[]);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Failed to load sensors");
        setSensors([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PageShell>
      <Topbar title="Sensors" />
      <div className="p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader
            title="Devices"
            right={
              <button className="rounded-2xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium">
                Add sensor
              </button>
            }
          />
          <CardBody>
            {err ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <div className="font-semibold">Couldn’t load sensors</div>
                <div className="mt-1">{err}</div>
                <div className="mt-2 text-rose-600">Farm: {farmId || "—"}</div>
              </div>
            ) : null}

            <div className="grid gap-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed p-8 text-center">
                  <div className="font-semibold">Loading sensors…</div>
                  <div className="mt-1 text-sm text-gray-600">Farm: {farmId || "—"}</div>
                </div>
              ) : null}

              {!loading &&
                sensors.map((s) => (
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
                          {s.zone ?? "Unassigned"} • {String(s.type).toUpperCase()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">Last seen {s.lastSeen}</div>
                    </div>
                  </Link>
                ))}

              {!loading && !sensors.length && !err ? (
                <div className="rounded-2xl border border-dashed p-8 text-center">
                  <div className="font-semibold">No sensors found</div>
                  <div className="mt-1 text-sm text-gray-600">Farm: {farmId}</div>
                  <div className="mt-3 text-sm text-gray-600">
                    Connect or register sensors to start monitoring.
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