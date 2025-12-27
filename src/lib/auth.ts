"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  getAuth,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebaseClient";

export function waitForAuth(): Promise<User> {
  const auth = getAuth();

  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) reject(new Error("Not signed in"));
      else resolve(user);
    });
  });
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}

export const loginEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth(), email, password);

export const loginGoogle = () => signInWithPopup(auth(), googleProvider());

export const logout = () => signOut(auth());