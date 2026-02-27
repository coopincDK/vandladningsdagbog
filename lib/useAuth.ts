"use client";
import { useEffect, useState } from "react";
import { signInAnonymously, onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); setLoading(false); }
      else { signInAnonymously(auth).catch(console.error); }
    });
    return unsub;
  }, []);

  return { user, uid: user?.uid ?? null, loading };
}
