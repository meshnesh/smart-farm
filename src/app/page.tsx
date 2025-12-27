"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listFarms } from "@/lib/data";
import { getCurrentFarmId, setCurrentFarmId } from "@/lib/session";
import { DBG } from "@/lib/debug";

export default function Home() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        DBG("Home: start", { storedFarmId: getCurrentFarmId() });

        const farms = await listFarms();
        if (cancelled) return;

        DBG("Home: listFarms returned", {
          count: farms?.length ?? 0,
          ids: (farms ?? []).map((f: any) => f.id),
        });

        if (!farms.length) {
          DBG("Home: farms=0 -> redirect /onboarding");
          router.replace("/onboarding");
          return;
        }

        const current = getCurrentFarmId();
        const first = farms[0]?.id;

        DBG("Home: current vs first", { current, first });

        if (!current && first) {
          DBG("Home: setCurrentFarmId(first)", { first });
          setCurrentFarmId(first);
          DBG("Home: storedFarmId now", { stored: getCurrentFarmId() });
        }

        DBG("Home: redirect /dashboard");
        router.replace("/dashboard");
      } catch (e: any) {
        if (cancelled) return;
        DBG("Home: ERROR", { message: e?.message, code: e?.code, e });
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
        <div className="text-sm text-gray-600 mt-1">Checking your farms.</div>
        {err ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {err}
          </div>
        ) : null}
      </div>
    </div>
  );
}