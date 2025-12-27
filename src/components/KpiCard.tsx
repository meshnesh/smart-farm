import { cn } from "@/lib/cn";

export function KpiCard({
  title,
  value,
  hint,
  tone = "default",
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-100 bg-emerald-50"
      : tone === "warn"
      ? "border-amber-100 bg-amber-50"
      : tone === "bad"
      ? "border-rose-100 bg-rose-50"
      : "border-gray-100 bg-white";

  return (
    <div className={cn("rounded-3xl border p-4 shadow-soft", toneCls)}>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}
