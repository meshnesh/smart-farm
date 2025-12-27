"use client";

import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Droplets, Gauge, Wrench, Sprout, RefreshCcw, ShieldCheck } from "lucide-react";

const actions = [
  { title: "Start Irrigation", desc: "Open irrigation workflow for a zone", icon: Droplets },
  { title: "Fertigation Mix", desc: "Track fertilizer application and ratios", icon: Sprout },
  { title: "Calibration", desc: "Calibrate sensors and verify baselines", icon: Gauge },
  { title: "Diagnostics", desc: "Run health checks on devices", icon: Wrench },
  { title: "Sync Data", desc: "Force refresh latest readings", icon: RefreshCcw },
  { title: "Safety Checklist", desc: "Daily checks for field operations", icon: ShieldCheck },
];

export default function QuickActionsPage() {
  return (
    <PageShell>
      <Topbar title="Quick Actions" />
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader title="Actions" />
          <CardBody>
            <div className="grid gap-3">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.title} className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-emerald-700" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{a.title}</div>
                        <div className="text-sm text-gray-600">{a.desc}</div>
                      </div>
                      <div className="text-sm text-emerald-700 font-medium">Open</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
