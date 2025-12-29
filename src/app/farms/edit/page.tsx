"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { getCurrentFarmId } from "@/lib/session";
import { getFarm, updateFarm } from "@/lib/data";

type FormState = {
  farmName: string;
  location: string;
  sizeInSquareMeters: string;
  cropsText: string;
};

function parseCrops(cropsText: string) {
  return cropsText
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toIntSafe(v: string, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function EditFarmPage() {
  const router = useRouter();

  const [farmId, setFarmId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    farmName: "",
    location: "",
    sizeInSquareMeters: "",
    cropsText: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const crops = useMemo(() => parseCrops(form.cropsText), [form.cropsText]);

  const canSave = useMemo(() => {
    return (
      !!farmId &&
      form.farmName.trim().length >= 2 &&
      form.location.trim().length >= 2 &&
      toIntSafe(form.sizeInSquareMeters, 0) > 0
    );
  }, [farmId, form]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const id = getCurrentFarmId();
      if (!id) {
        router.replace("/select-farm");
        return;
      }
      setFarmId(id);

      try {
        setLoading(true);
        setErr(null);

        const f = await getFarm(id);
        if (cancelled) return;

        if (!f) {
          setErr("Farm not found.");
          return;
        }

        setForm({
          farmName: f.farmName ?? f.name ?? "",
          location: f.location ?? "",
          sizeInSquareMeters: String(f.sizeInSquareMeters ?? ""),
          cropsText: Array.isArray(f.crops) ? f.crops.join(", ") : "",
        });
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ?? "Failed to load farm");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSave() {
    if (!farmId || !canSave || saving) return;

    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      await updateFarm(farmId, {
        farmName: form.farmName.trim(),
        location: form.location.trim(),
        sizeInSquareMeters: toIntSafe(form.sizeInSquareMeters, 0),
        crops,
      });
      setOk("Saved.");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save farm");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <Topbar title="Edit Farm" />

      <div className="p-4 md:p-6 max-w-3xl space-y-4">
        <Card>
          <CardHeader title="Farm details" />
          <CardBody>
            {loading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : null}

            {err ? (
              <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                {err}
              </div>
            ) : null}

            {ok ? (
              <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                {ok}
              </div>
            ) : null}

            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Farm name</label>
                <input
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
                  value={form.farmName}
                  onChange={(e) => setForm((p) => ({ ...p, farmName: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Location</label>
                <input
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Size (m²)</label>
                  <input
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
                    inputMode="numeric"
                    value={form.sizeInSquareMeters}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, sizeInSquareMeters: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Crops (comma separated)</label>
                  <input
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
                    value={form.cropsText}
                    onChange={(e) => setForm((p) => ({ ...p, cropsText: e.target.value }))}
                  />
                </div>
              </div>

              <button
                onClick={onSave}
                disabled={!canSave || saving}
                className={[
                  "rounded-2xl px-4 py-3 text-sm font-semibold",
                  !canSave || saving
                    ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
                ].join(" ")}
              >
                {saving ? "Saving..." : "Save farm"}
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}