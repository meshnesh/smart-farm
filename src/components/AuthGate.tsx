"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import {
  clearCurrentFarmId,
  getCurrentFarmId,
  setCurrentFarmId,
} from "@/lib/session";
import { getFarm, listFarms } from "@/lib/data";
import { DBG } from "@/lib/debug";

function isPublicPath(path: string) {
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
    DBG("AuthGate mount", {
      pathname,
      storedFarmId: getCurrentFarmId(),
    });

    const unsub = onAuthStateChanged(auth(), async (u) => {
      setUser(u ?? null);

      DBG("AuthGate auth change", {
        pathname,
        hasUser: !!u,
        uid: u?.uid ?? null,
        email: u?.email ?? null,
        storedFarmId: getCurrentFarmId(),
      });

      if (isPublicPath(pathname)) {
        DBG("AuthGate: public path -> allow");
        setChecking(false);
        return;
      }

      if (!u) {
        DBG("AuthGate: no user -> redirect /login");
        setChecking(false);
        router.replace("/login");
        return;
      }

      try {
        DBG("AuthGate: calling listFarms()");
        const farms = await listFarms();

        DBG("AuthGate: listFarms() returned", {
          count: farms?.length ?? 0,
          ids: (farms ?? []).map((f: any) => f.id),
        });

        // No farms -> onboarding
        if (!farms.length) {
          DBG("AuthGate: farms=0 -> redirect /onboarding");
          setChecking(false);
          if (!isOnboardingPath(pathname)) router.replace("/onboarding");
          return;
        }

        const selected = getCurrentFarmId();
        DBG("AuthGate: selected from storage", { selected });

        // If nothing selected, pick first farm (auto-heal)
        if (!selected) {
          DBG("AuthGate: no selected -> set first farm", { first: farms[0].id });
          setCurrentFarmId(farms[0].id);
          DBG("AuthGate: after setCurrentFarmId", { stored: getCurrentFarmId() });
          setChecking(false);
          return;
        }

        // If selected is in the user's list, ok
        const inList = farms.some((f: any) => f.id === selected);
        DBG("AuthGate: selected in list?", { inList });

        if (inList) {
          DBG("AuthGate: allow");
          setChecking(false);
          return;
        }

        // Self-heal: try to fetch selected farm directly
        DBG("AuthGate: selected NOT in list -> calling getFarm()", { selected });
        const direct = await getFarm(selected);
        DBG("AuthGate: getFarm() result", direct);

        // If farm exists and owned by user, accept
        if (direct && direct.userId === u.uid) {
          DBG("AuthGate: direct ok -> allow");
          setChecking(false);
          return;
        }

        // Otherwise selection invalid
        DBG("AuthGate: selection invalid -> clear");
        clearCurrentFarmId();
        DBG("AuthGate: after clear", { stored: getCurrentFarmId() });

        setChecking(false);

        // Don’t block onboarding/select-farm routes
        if (!isSelectFarmPath(pathname) && !isOnboardingPath(pathname)) {
          DBG("AuthGate: redirect /select-farm");
          router.replace("/select-farm");
        }
      } catch (e: any) {
        DBG("AuthGate: ERROR", { message: e?.message, code: e?.code, e });
        setChecking(false);
      }
    });

    return () => unsub();
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}