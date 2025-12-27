"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { listFarms } from "@/lib/data";
import { getCurrentFarmId, setCurrentFarmId } from "@/lib/session";
import { auth } from "@/lib/firebaseClient";
import { DBG } from "@/lib/debug";

type FarmRow = {
  id: string;
  farmName?: string;
  name?: string;
  location?: string;
  crops?: string[];
  crop?: string;
};

export default function SelectFarmPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<FarmRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    DBG("SelectFarm mount", { storedFarmId: getCurrentFarmId() });

    let cancelled = false;

    const unsub = auth().onAuthStateChanged(async (u) => {
      if (cancelled) return;

      if (!u) {
        DBG("SelectFarm: no user -> redirect /login");
        router.replace("/login");
        return;
      }

      DBG("SelectFarm: auth ok", {
        uid: u.uid,
        email: u.email ?? null,
        storedFarmId: getCurrentFarmId(),
      });

      try {
        setLoading(true);
        setError(null);

        const rows = await listFarms();
        if (cancelled) return;

        DBG("SelectFarm: farms loaded", {
          count: rows?.length ?? 0,
          ids: (rows ?? []).map((f: any) => f.id),
        });

        if (!rows || rows.length === 0) {
          DBG("SelectFarm: farms=0 -> redirect /onboarding");
          router.replace("/onboarding");
          return;
        }

        setFarms(rows as any);

        const preferred = getCurrentFarmId();
        const preferredIsValid = !!preferred && rows.some((f: any) => f.id === preferred);

        const initial = preferredIsValid ? (preferred as string) : rows[0].id;

        DBG("SelectFarm: selection resolve", { preferred, preferredIsValid, initial });

        if (!preferredIsValid) {
          setCurrentFarmId(initial);
          DBG("SelectFarm: storedFarmId healed", { stored: getCurrentFarmId() });
        }

        setSelected(initial);
      } catch (e: any) {
        if (cancelled) return;
        DBG("SelectFarm: ERROR", { message: e?.message, code: e?.code, e });
        setError(e?.message ?? "Failed to load farms");
        setFarms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [router]);

  const canContinue = useMemo(() => !!selected, [selected]);

  const onContinue = () => {
    if (!selected) return;
    DBG("SelectFarm: continue", { selected });
    setCurrentFarmId(selected);
    DBG("SelectFarm: storedFarmId now", { stored: getCurrentFarmId() });
    router.replace("/dashboard");
  };

  return (
    <PageShell>
      <Topbar title="Select Farm" />

      <div className="p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader title="Choose a farm workspace" />
          <CardBody>
            {loading ? (
              <div className="text-sm text-gray-600">Loading farms…</div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
                <div className="font-semibold">Couldn’t load farms</div>
                <div className="text-sm opacity-80">{error}</div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => router.refresh()}
                    className="rounded-2xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  {farms.map((f) => {
                    const title = f.farmName ?? f.name ?? f.id;
                    const location = (f.location ?? "").trim();
                    const crops =
                      Array.isArray(f.crops) && f.crops.length
                        ? f.crops.join(", ")
                        : f.crop ?? "";

                    const isSelected = selected === f.id;

                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelected(f.id)}
                        className={[
                          "w-full rounded-2xl border p-4 text-left hover:bg-gray-50",
                          isSelected ? "border-emerald-600 bg-emerald-50" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold">{title}</div>
                            <div className="mt-1 text-sm text-gray-600">
                              {location ? location : "—"}
                              {crops ? ` • ${crops}` : ""}
                            </div>
                          </div>

                          <div
                            className={[
                              "h-5 w-5 rounded-full border flex items-center justify-center",
                              isSelected ? "border-emerald-600" : "border-gray-300",
                            ].join(" ")}
                          >
                            {isSelected ? (
                              <div className="h-3 w-3 rounded-full bg-emerald-600" />
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <Link
                    href="/farms/new"
                    className="text-sm font-medium text-emerald-700 hover:underline"
                  >
                    + Add new farm
                  </Link>

                  <button
                    onClick={onContinue}
                    disabled={!canContinue}
                    className={[
                      "rounded-2xl px-5 py-2 text-sm font-semibold",
                      canContinue
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed",
                    ].join(" ")}
                  >
                    Continue
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Later we’ll connect this to org/workspaces + invites.
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}