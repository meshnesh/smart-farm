"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { createFarm } from "@/lib/data";
import { setCurrentFarmId } from "@/lib/session";
import { MapPin, Sprout, Ruler, Layers, Plus, CheckCircle2 } from "lucide-react";

type FormState = {
  farmName: string;
  location: string;
  sizeInSquareMeters: string;
  cropsText: string;
  zones: string;
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

function toFloatSafe(v: string, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function AddFarmPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    farmName: "",
    location: "",
    sizeInSquareMeters: "",
    cropsText: "",
    zones: "1",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crops = useMemo(() => parseCrops(form.cropsText), [form.cropsText]);

  const canSubmit = useMemo(() => {
    return (
      form.farmName.trim().length >= 2 &&
      form.location.trim().length >= 2 &&
      toFloatSafe(form.sizeInSquareMeters, 0) > 0 &&
      toIntSafe(form.zones, 0) > 0
    );
  }, [form]);

  async function onSubmit() {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const size = toFloatSafe(form.sizeInSquareMeters, 0);
      const zones = toIntSafe(form.zones, 1);

      const res = await createFarm({
        farmName: form.farmName.trim(),
        location: form.location.trim(),
        sizeInSquareMeters: size,
        crops,
        zones,
      });

      // pick it immediately
      setCurrentFarmId(res.farmId);

      // back to dashboard (or /select-farm if you prefer)
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create farm");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <Topbar title="Add Farm" />

      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <div>
          <div className="text-sm text-gray-600">Farms</div>
          <div className="text-2xl font-semibold">Create another farm</div>
          <div className="mt-1 text-sm text-gray-600">
            This will be added to your account. You can switch farms anytime.
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
            <div className="font-semibold">Couldn’t create farm</div>
            <div className="text-sm opacity-80">{error}</div>
          </div>
        ) : null}

        <Card>
          <CardHeader title="Farm details" />
          <CardBody>
            <div className="grid gap-4">
              {/* Farm name */}
              <div>
                <label className="text-sm font-medium text-gray-700">Farm name</label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border px-3 py-2">
                  <Sprout className="h-4 w-4 text-gray-500" />
                  <input
                    className="w-full outline-none text-sm"
                    placeholder="e.g. Munene Limuru Farm"
                    value={form.farmName}
                    onChange={(e) => setForm((p) => ({ ...p, farmName: e.target.value }))}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-sm font-medium text-gray-700">Location</label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border px-3 py-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <input
                    className="w-full outline-none text-sm"
                    placeholder="e.g. Limuru"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">Used to fetch weather for this farm.</div>
              </div>

              {/* Size + Zones */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Size (m²)</label>
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border px-3 py-2">
                    <Ruler className="h-4 w-4 text-gray-500" />
                    <input
                      className="w-full outline-none text-sm"
                      placeholder="e.g. 200"
                      inputMode="decimal"
                      value={form.sizeInSquareMeters}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, sizeInSquareMeters: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Zones</label>
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border px-3 py-2">
                    <Layers className="h-4 w-4 text-gray-500" />
                    <input
                      className="w-full outline-none text-sm"
                      placeholder="e.g. 3"
                      inputMode="numeric"
                      value={form.zones}
                      onChange={(e) => setForm((p) => ({ ...p, zones: e.target.value }))}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">You can name zones later.</div>
                </div>
              </div>

              {/* Crops */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Crops (comma separated)
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border px-3 py-2">
                  <Plus className="h-4 w-4 text-gray-500" />
                  <input
                    className="w-full outline-none text-sm"
                    placeholder="e.g. Potatoes, Tomatoes"
                    value={form.cropsText}
                    onChange={(e) => setForm((p) => ({ ...p, cropsText: e.target.value }))}
                  />
                </div>

                {crops.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {crops.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                onClick={onSubmit}
                disabled={!canSubmit || submitting}
                className={[
                  "rounded-2xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2",
                  !canSubmit || submitting
                    ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
                ].join(" ")}
              >
                {submitting ? "Creating..." : "Create farm"}
                <CheckCircle2 className="h-4 w-4" />
              </button>

              <div className="text-xs text-gray-500">
                Tip: after creating, you’ll land on the dashboard for the new farm.
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}