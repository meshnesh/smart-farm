"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { auth, db } from "@/lib/firebaseClient";
import { listFarms } from "@/lib/data";

import { MapPin, LogOut, Shield, Bell, Users, Leaf, Pencil } from "lucide-react";

const useFirestore = process.env.NEXT_PUBLIC_USE_FIRESTORE === "true";

type UserDoc = {
  userId?: string;
  uid?: string;

  email?: string;
  firstName?: string;
  secondName?: string;
  name?: string;

  phone?: string;
  location?: string;

  role?: string; // "owner"
  profileImageUrl?: string;

  interestedIn?: string;
  farmSetupEnum?: string;
};

type FarmDoc = {
  id: string;
  farmId?: string;
  farmName?: string;
  name?: string;
  location?: string;
  crops?: string[] | string;
  userId?: string;
};

function initialsFrom(nameOrEmail: string) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function bestProfilePhoto(userDoc: UserDoc | null, authUser: FirebaseUser | null) {
  const fromDoc = userDoc?.profileImageUrl && String(userDoc.profileImageUrl).trim();
  const fromAuth = authUser?.photoURL && String(authUser.photoURL).trim();
  return fromDoc || fromAuth || null;
}

export default function ProfilePage() {
  const router = useRouter();

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [farms, setFarms] = useState<FarmDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Keep auth state; redirect to /login if signed out
  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), (u) => {
      setAuthUser(u ?? null);

      if (!u) {
        // Important: avoid crashes inside data.ts when requireUser() is called
        router.replace("/login");
      }
    });

    return () => unsub();
  }, [router]);

  // Subscribe to user doc (realtime)
  useEffect(() => {
    if (!useFirestore) {
      // mock mode: show a friendly placeholder
      setUserDoc({
        name: "Demo User",
        email: "demo@smartfarm.local",
        role: "owner",
        location: "—",
      });
      setLoading(false);
      return;
    }

    if (!authUser?.uid) return;

    setErr(null);
    setLoading(true);

    const ref = doc(db(), "users", authUser.uid);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setUserDoc((snap.data() as any) ?? null);
        setLoading(false);
      },
      (e) => {
        setErr(e?.message ?? "Failed to load profile");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authUser?.uid]);

  // Subscribe to farms owned by this user (realtime)
  useEffect(() => {
    let unsub: Unsubscribe | null = null;

    (async () => {
      if (!authUser?.uid) return;

      if (!useFirestore) {
        // use whatever listFarms() returns in mock mode
        const f = (await listFarms()) as any[];
        setFarms(
          f.map((x) => ({
            id: x.id,
            farmName: x.farmName ?? x.name,
            name: x.name ?? x.farmName,
            location: x.location ?? "",
            crops: x.crops ?? x.crop ?? [],
            userId: x.userId,
          }))
        );
        return;
      }

      setErr(null);

      const qy = query(collection(db(), "farms"), where("userId", "==", authUser.uid));
      unsub = onSnapshot(
        qy,
        (snap) => {
          const rows = snap.docs.map((d) => {
            const x: any = d.data();
            return {
              id: d.id,
              farmId: x.farmId ?? d.id,
              farmName: x.farmName ?? x.name ?? d.id,
              name: x.farmName ?? x.name ?? d.id,
              location: x.location ?? "",
              crops: x.crops ?? [],
              userId: x.userId,
            } as FarmDoc;
          });
          setFarms(rows);
        },
        (e) => setErr(e?.message ?? "Failed to load farms")
      );
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [authUser?.uid]);

  const displayName = useMemo(() => {
    const fromDoc =
      userDoc?.name ||
      [userDoc?.firstName, userDoc?.secondName].filter(Boolean).join(" ").trim();
    return fromDoc || authUser?.displayName || "User";
  }, [userDoc, authUser]);

  const email = useMemo(() => {
    return userDoc?.email || authUser?.email || "—";
  }, [userDoc, authUser]);

  const photoUrl = useMemo(() => bestProfilePhoto(userDoc, authUser), [userDoc, authUser]);
  const initials = useMemo(() => initialsFrom(displayName || email), [displayName, email]);

  const role = userDoc?.role || "owner";
  const location = userDoc?.location || "—";
  const interestedIn = userDoc?.interestedIn || "—";

  async function handleSignOut() {
    try {
      await signOut(auth());
    } finally {
      router.replace("/login");
    }
  }

  return (
    <PageShell>
      <Topbar title="Profile" />

      <div className="p-4 md:p-6 space-y-4">
        {err ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
            <div className="font-semibold">Something went wrong</div>
            <div className="text-sm opacity-80">{err}</div>
          </div>
        ) : null}

        {/* Account */}
        <Card>
          <CardHeader title="Account" />
          <CardBody>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="h-14 w-14 rounded-full object-cover border"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gray-200 border flex items-center justify-center font-semibold text-gray-700">
                    {initials}
                  </div>
                )}

                <div>
                  <div className="font-semibold">
                    {loading ? "Loading…" : displayName}
                  </div>
                  <div className="text-sm text-gray-600">{email}</div>
                  <div className="mt-1 inline-flex items-center gap-2 text-xs text-gray-600">
                    <span className="rounded-full border px-2 py-0.5">
                      {String(role).toUpperCase()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-500" />
                      {location}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/profile/edit"
                  className="rounded-2xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit profile
                </Link>

                <Link
                  href="/select-farm"
                  className="rounded-2xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Switch farm
                </Link>

                <Link
                  href="/farms/new"
                  className="rounded-2xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  + Add farm
                </Link>

                <button
                  onClick={handleSignOut}
                  className="rounded-2xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>

            {/* Extra profile fields */}
            <div className="mt-6 grid md:grid-cols-3 gap-3">
              <div className="rounded-2xl border p-4">
                <div className="text-xs text-gray-500">Interested in</div>
                <div className="mt-1 font-semibold text-gray-900">{interestedIn}</div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-xs text-gray-500">Phone</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {userDoc?.phone ? String(userDoc.phone) : "—"}
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-xs text-gray-500">Farm setup</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {userDoc?.farmSetupEnum ? String(userDoc.farmSetupEnum) : "—"}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Farms */}
        <Card>
          <CardHeader title="My Farms" right={<span className="text-xs text-gray-500">owned by this account</span>} />
          <CardBody>
            {!farms.length ? (
              <div className="rounded-2xl border border-dashed p-6 text-center">
                <div className="font-semibold">No farms found</div>
                <div className="mt-1 text-sm text-gray-600">
                  Create a farm to start seeing dashboard data.
                </div>
                <Link
                  href="/select-farm"
                  className="mt-4 inline-block rounded-2xl bg-emerald-600 text-white px-4 py-3 text-sm font-medium"
                >
                  Go to farm selection
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {farms.map((f) => (
                  <div key={f.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{f.farmName ?? f.name ?? f.id}</div>
                        <div className="text-sm text-gray-600 inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          {f.location ?? "—"}
                        </div>

                        <div className="mt-2 text-xs text-gray-600">
                          Crops:{" "}
                          {Array.isArray(f.crops)
                            ? (f.crops.length ? f.crops.join(", ") : "—")
                            : (f.crops ? String(f.crops) : "—")}
                        </div>

                        <div className="mt-3">
                          <Link
                            href={`/farms/${encodeURIComponent(f.id)}/edit`}
                            className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium hover:bg-gray-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit farm
                          </Link>
                        </div>
                      </div>

                      <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">
                        ID: {f.id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader title="Settings" />
          <CardBody>
            <div className="grid gap-3">
              <button className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-700" />
                  <div className="font-semibold">Notifications</div>
                </div>
                <div className="text-sm text-gray-600">
                  Alert preferences (we’ll wire this to Firestore next)
                </div>
              </button>

              <button className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-700" />
                  <div className="font-semibold">Team & Access</div>
                </div>
                <div className="text-sm text-gray-600">
                  Single user for now. Later: invite workers and assign roles.
                </div>
              </button>

              <button className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-700" />
                  <div className="font-semibold">Security</div>
                </div>
                <div className="text-sm text-gray-600">
                  Sign-in methods and session handling (later)
                </div>
              </button>

              <button className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-gray-700" />
                  <div className="font-semibold">Data & Device Setup</div>
                </div>
                <div className="text-sm text-gray-600">
                  Useful links: connect devices, sensor naming conventions, zones (later)
                </div>
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}