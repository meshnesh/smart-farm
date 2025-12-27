"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, Bell, Search, LogOut, User, Repeat2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { auth } from "@/lib/firebaseClient";
import { signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

function initialsFromName(name?: string | null, email?: string | null) {
  const base = (name ?? "").trim() || (email ?? "").trim();
  if (!base) return "U";
  const parts = base.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export function Topbar({ title }: { title: string }) {
  const router = useRouter();

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside / escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // any element in our menu/trigger has data-topbar-menu
      if (t.closest("[data-topbar-menu]")) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const displayName = user?.displayName ?? "Account";
  const email = user?.email ?? "";
  const photoUrl = user?.photoURL ?? null;

  const initials = useMemo(() => initialsFromName(displayName, email), [displayName, email]);

  async function handleSignOut() {
    try {
      await signOut(auth());
    } finally {
      setOpen(false);
      router.push("/login");
    }
  }

  return (
    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="w-full px-4 md:px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-soft">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm text-gray-500">SmartFarm</div>
            <div className="font-semibold">{title}</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            className={cn("h-10 w-10 rounded-2xl border flex items-center justify-center hover:bg-gray-50")}
            aria-label="Search"
            type="button"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            className={cn("h-10 w-10 rounded-2xl border flex items-center justify-center hover:bg-gray-50")}
            aria-label="Notifications"
            type="button"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* Avatar + menu */}
          <div className="relative" data-topbar-menu>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "h-10 w-10 rounded-full border overflow-hidden flex items-center justify-center hover:bg-gray-50",
                open ? "ring-2 ring-emerald-200" : ""
              )}
              aria-label="Account menu"
              aria-expanded={open}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-gray-700">{initials}</span>
              )}
            </button>

            {open ? (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border bg-white shadow-lg overflow-hidden">
                <div className="p-3 border-b">
                  <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>
                  <div className="text-xs text-gray-600 truncate">{email || "Not signed in"}</div>
                </div>

                <div className="p-2">
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <User className="h-4 w-4 text-gray-600" />
                    Profile
                  </Link>

                  <Link
                    href="/select-farm"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <Repeat2 className="h-4 w-4 text-gray-600" />
                    Switch farm
                  </Link>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-gray-50 text-left"
                  >
                    <LogOut className="h-4 w-4 text-gray-600" />
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}