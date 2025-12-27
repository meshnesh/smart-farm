"use client";

import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

export function MoistureArea({ data }: { data: any[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="moisture" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarMini({ data }: { data: any[] }) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="alerts" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Add to your existing Charts.tsx exports
export function TempArea({
  data,
}: {
  data: { label: string; tempC: number }[];
}) {
  // If your MoistureArea is implemented with Recharts,
  // this should match your style; just swap the dataKey.
  // Example assumes you already use ResponsiveContainer + AreaChart.
  return (
    <MoistureArea
      data={data.map((d) => ({ hour: d.label, moisture: d.tempC }))}
    />
  );
}