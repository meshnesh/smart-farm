"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { getCurrentFarmId } from "@/lib/session";
import { listFarms } from "@/lib/data";

function isPublicPath(path: string) {
  // add any routes that should not be guarded
  return path.startsWith("/login");
}

function isOnboardingPath(path: string) {
  return path.startsWith("/onboarding");
}

function isSelectFarmPath(path: string) {
  return path.startsWith("/select-farm");
}

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), async (u) => {
      setUser(u ?? null);

      // If this is a public page, don’t block
      if (isPublicPath(pathname)) {
        setChecking(false);
        return;
      }

      if (!u) {
        // Not signed in -> login
        setChecking(false);
        router.replace("/login");
        return;
      }

      try {
        // Signed in -> check farms
        const farms = await listFarms();

        // No farms -> force onboarding (and don’t allow other routes)
        if (!farms.length) {
          setChecking(false);
          if (!isOnboardingPath(pathname)) router.replace("/onboarding");
          return;
        }

        // Farms exist -> require selected farmId (except onboarding/select-farm)
        const currentFarmId = getCurrentFarmId();

        if (!currentFarmId && !isSelectFarmPath(pathname) && !isOnboardingPath(pathname)) {
          setChecking(false);
          router.replace("/select-farm");
          return;
        }

        setChecking(false);
      } catch {
        // If farms fetch fails, keep user in app but stop spinner
        setChecking(false);
      }
    });

    return () => unsub();
    // IMPORTANT: pathname affects routing decisions
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  // If we’re on public pages, or user is present (AuthGate redirects otherwise)
  return <>{children}</>;
}