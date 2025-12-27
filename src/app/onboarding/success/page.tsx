"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody } from "@/components/Card";
import { setCurrentFarmId } from "@/lib/session";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

export default function OnboardingSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();

  const farmId = params.get("farmId") ?? "";

  // Ensure session is set even if user refreshes success page
  useEffect(() => {
    if (farmId) setCurrentFarmId(farmId);
  }, [farmId]);

  return (
    <PageShell>
      <Topbar title="Onboarding" />

      <div className="p-4 md:p-6 max-w-3xl">
        <Card>
          <CardBody>
            <div className="py-10 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-700" />
              </div>

              <div className="mt-4 text-2xl font-semibold">Farm set up successful</div>
              <div className="mt-2 text-sm text-gray-600">
                You can now open your farm dashboard. Sensors can be added next.
              </div>

              {farmId ? (
                <div className="mt-4 text-xs text-gray-500">Farm ID: {farmId}</div>
              ) : null}

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="rounded-2xl bg-emerald-600 text-white px-5 py-3 text-sm font-semibold hover:bg-emerald-700"
                >
                  Open your farm
                </button>

                <Link
                  href="/onboarding"
                  className="rounded-2xl border px-5 py-3 text-sm font-semibold hover:bg-gray-50"
                >
                  Create another
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}