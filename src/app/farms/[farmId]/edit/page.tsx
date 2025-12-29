"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { auth } from "@/lib/firebaseClient";
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

function toIntSafe(v: string) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export default function EditFarmPage() {
  const router = useRouter();
  const params = useParams();
  const farmId = String((params as any)?.farmId ?? "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    farmName: "",
    location: "",
    sizeInSquareMeters: "",
    cropsText: "",
  });

  const crops = useMemo(() => parseCrops(form.cropsText), [form.cropsText]);

  const canSave = useMemo(() => {
    return (
      !saving &&
      farmId &&
      form.farmName.trim().length >= 1 &&
      form.location.trim().length >= 1 &&
      toIntSafe(form.sizeInSquareMeters) > 0
    );
  }, [saving, farmId, form]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), (u) => {
      if (!u) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const f = await getFarm(farmId);
        if (cancelled) return;

        if (!f) {
          setErr("Farm not found.");
          return;
        }

        setForm({
          farmName: String(f.farmName ?? f.name ?? ""),
          location: String(f.location ?? ""),
          sizeInSquareMeters: String(f.sizeInSquareMeters ?? ""),
          cropsText: Array.isArray(f.crops) ? f.crops.join(", ") : "",
        });
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load farm");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [farmId]);

  async function onSave() {
    if (!canSave) return;

    try {
      setSaving(true);
      setErr(null);
      setOk(null);

      await updateFarm(farmId, {
        farmName: form.farmName.trim(),
        location: form.location.trim(),
        sizeInSquareMeters: toIntSafe(form.sizeInSquareMeters),
        crops,
      });

      setOk("Saved.");
      setTimeout(() => router.replace("/profile"), 400);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save farm");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <Topbar title="Edit Farm" />

      <div className="p-4 md:p-6 max-w-2xl space-y-4">
        <Card>
          <CardHeader title="Farm details" />
          <CardBody>
            {loading ? <div className="text-sm text-gray-600">Loading…</div> : null}

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
                    onChange={(e) => setForm((p) => ({ ...p, sizeInSquareMeters: e.target.value }))}
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.back()}
                  className="rounded-2xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={onSave}
                  disabled={!canSave}
                  className={[
                    "rounded-2xl px-4 py-3 text-sm font-semibold",
                    !canSave ? "bg-gray-200 text-gray-600 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700",
                  ].join(" ")}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>

              <div className="text-xs text-gray-500">
                farmId + userId are locked. We only edit safe fields.
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}