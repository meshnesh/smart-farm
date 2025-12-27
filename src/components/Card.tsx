import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border bg-white shadow-soft", className)}>{children}</div>;
}

export function CardHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="px-5 py-4 border-b flex items-center gap-3">
      <div className="font-semibold">{title}</div>
      <div className="ml-auto">{right}</div>
    </div>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="p-5">{children}</div>;
}
