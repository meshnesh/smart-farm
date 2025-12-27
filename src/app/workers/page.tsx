"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { getCurrentFarmId } from "@/lib/session";
import { listWorkers } from "@/lib/data";
import { farms } from "@/lib/mock";
import type { Worker } from "@/lib/types";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    const farmId = getCurrentFarmId() ?? farms[0].id;
    listWorkers(farmId).then(setWorkers);
  }, []);

  return (
    <PageShell>
      <Topbar title="Workers" />
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader
            title="Team"
            right={<button className="rounded-2xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium">Add worker</button>}
          />
          <CardBody>
            <div className="grid gap-3">
              {workers.map((w) => (
                <div key={w.id} className="rounded-2xl border p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-sm text-gray-600">{w.role.toUpperCase()} • {w.zone ?? "—"}</div>
                    </div>
                    <div className="text-sm text-gray-600">{w.phone ?? ""}</div>
                  </div>
                </div>
              ))}
              {!workers.length ? (
                <div className="rounded-2xl border border-dashed p-8 text-center">
                  <div className="font-semibold">No workers yet</div>
                  <div className="mt-1 text-sm text-gray-600">Add workers to manage field operations.</div>
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
