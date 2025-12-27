import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AuthGate } from "@/components/AuthGate";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen">
        <div className="w-full md:flex">
          <Sidebar />
          <main className="flex-1 pb-24 md:pb-10 min-w-0">{children}</main>
        </div>
        <BottomNav />
      </div>
    </AuthGate>
  );
}
