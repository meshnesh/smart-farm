"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

import { PageShell } from "@/components/PageShell";
import { Topbar } from "@/components/Topbar";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { auth } from "@/lib/firebaseClient";
import { getUserProfile, updateUserProfile } from "@/lib/data";

const useFirestore = process.env.NEXT_PUBLIC_USE_FIRESTORE === "true";

type FormState = {
  firstName: string;
  secondName: string;
  phone: string;
  location: string;
  interestedIn: string;
};

export default function EditProfilePage() {
  const router = useRouter();

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [form, setForm] = useState<FormState>({
    firstName: "",
    secondName: "",
    phone: "",
    location: "",
    interestedIn: "",
  });

  const [email, setEmail] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), (u) => {
      setAuthUser(u ?? null);
      if (!u) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!authUser?.uid) return;

      try {
        setLoading(true);
        setErr(null);

        if (!useFirestore) {
          setEmail(authUser.email ?? "—");
          setForm({
            firstName: "Demo",
            secondName: "User",
            phone: "",
            location: "",
            interestedIn: "",
          });
          return;
        }

        const doc = await getUserProfile(authUser.uid);
        if (cancelled) return;

        setEmail(doc?.email ?? authUser.email ?? "—");
        setForm({
          firstName: String(doc?.firstName ?? ""),
          secondName: String(doc?.secondName ?? ""),
          phone: String(doc?.phone ?? ""),
          location: String(doc?.location ?? ""),
          interestedIn: String(doc?.interestedIn ?? ""),
        });
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.uid]);

  const canSave = useMemo(() => {
    if (saving) return false;
    if (form.firstName.trim().length > 50) return false;
    if (form.secondName.trim().length > 50) return false;
    if (form.location.trim().length > 200) return false;
    return true;
  }, [form, saving]);

  async function onSave() {
    if (!authUser?.uid || !useFirestore) {
      router.back();
      return;
    }

    if (!canSave) return;

    try {
      setSaving(true);
      setErr(null);
      setOk(null);

      await updateUserProfile(authUser.uid, {
        firstName: form.firstName.trim(),
        secondName: form.secondName.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        interestedIn: form.interestedIn.trim(),
      });

      setOk("Saved.");
      setTimeout(() => router.replace("/profile"), 400);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <Topbar title="Edit Profile" />

      <div className="p-4 md:p-6 max-w-2xl space-y-4">
        <Card>
          <CardHeader title="Farmer details" />
          <CardBody>
            {loading ? <div className="text-sm text-gray-600">Loading…</div> : null}

            {err ? (
              <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                {err}
              </div>
            ) : null}

            {ok ? (
              <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                {ok}
              </div>
            ) : null}

            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email (locked)</label>
                <input
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm bg-gray-50"
                  value={email}
                  disabled
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">First name</label>
                  <input
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Second name</label>
                  <input
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
                    value={form.secondName}
                    onChange={(e) => setForm((p) => ({ ...p, secondName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <input
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <input
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Interested in</label>
                <input
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
                  value={form.interestedIn}
                  onChange={(e) => setForm((p) => ({ ...p, interestedIn: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.back()}
                  className="rounded-2xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={onSave}
                  disabled={!canSave}
                  className={[
                    "rounded-2xl px-4 py-3 text-sm font-semibold",
                    !canSave
                      ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700",
                  ].join(" ")}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Email & userId are locked to protect ownership + rules.
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}