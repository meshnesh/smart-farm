import { ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";

export function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-white">
        <main className="min-w-0">{children}</main>
      </div>
    </AuthGate>
  );
}