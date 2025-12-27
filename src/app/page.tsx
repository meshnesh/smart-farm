"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listFarms } from "@/lib/data";
import { getCurrentFarmId, setCurrentFarmId } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const farms = await listFarms();

        if (cancelled) return;

        // No farms -> onboarding
        if (!farms.length) {
          router.replace("/onboarding");
          return;
        }

        // Has farms -> ensure current farm is set
        const current = getCurrentFarmId();
        const first = farms[0]?.id;

        if (!current && first) setCurrentFarmId(first);

        router.replace("/dashboard");
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ?? "Failed to load farms");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="rounded-2xl border p-6 w-full max-w-md bg-white">
        <div className="font-semibold text-lg">Loading…</div>
        <div className="text-sm text-gray-600 mt-1">
          Checking your farms.
        </div>
        {err ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {err}
          </div>
        ) : null}
      </div>
    </div>
  );
}