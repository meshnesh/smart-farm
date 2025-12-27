"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginEmail, loginGoogle, useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!loading && user) {
    router.replace("/select-farm");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-soft">
        <div className="text-xl font-semibold">Sign in</div>
        <p className="mt-2 text-sm text-gray-600">
          Firestore rules require authenticated users for reads.
        </p>

        <button
          onClick={async () => {
            setErr(null);
            try {
              await loginGoogle();
              router.replace("/select-farm");
            } catch (e: any) {
              setErr(e?.message ?? "Google sign-in failed");
            }
          }}
          className="mt-5 w-full rounded-2xl border px-4 py-3 font-medium hover:bg-gray-50"
        >
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <div className="text-xs text-gray-500">or</div>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <div className="grid gap-3">
          <input
            className="rounded-2xl border px-4 py-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-2xl border px-4 py-3"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={async () => {
              setErr(null);
              try {
                await loginEmail(email, password);
                router.replace("/select-farm");
              } catch (e: any) {
                setErr(e?.message ?? "Email sign-in failed");
              }
            }}
            className="rounded-2xl bg-emerald-600 text-white px-4 py-3 font-medium"
          >
            Sign in
          </button>
        </div>

        {err ? <div className="mt-4 text-sm text-rose-700">{err}</div> : null}
      </div>
    </div>
  );
}