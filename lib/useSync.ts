"use client";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useStore } from "./store";
import { useAuth } from "./useAuth";
import type { UserProfile, Entry, DiaryDay } from "./types";

interface SyncData {
  profile: UserProfile | null;
  days: DiaryDay[];
  entries: Entry[];
  updatedAt: string;
}

export function useSync() {
  const { uid } = useAuth();
  const profile = useStore((s) => s.profile);
  const days = useStore((s) => s.days);
  const entries = useStore((s) => s.entries);
  const lastSyncRef = useRef<string>("");
  const isRemoteUpdate = useRef(false);

  const docRef = useMemo(() => uid ? doc(db, "users", uid) : null, [uid]);

  // Upload til Firestore
  const upload = useCallback(async () => {
    if (!docRef || isRemoteUpdate.current) return;

    // Fjern undefined-felter (Firestore tillader dem ikke)
    const clean = (obj: unknown): unknown => JSON.parse(JSON.stringify(obj));

    const data: SyncData = clean({
      profile,
      days,
      entries,
      updatedAt: new Date().toISOString(),
    }) as SyncData;

    const hash = JSON.stringify({ profile, days, entries });
    if (hash === lastSyncRef.current) return;
    lastSyncRef.current = hash;

    try {
      await setDoc(docRef, data, { merge: true });
      console.log("[Sync] Uploadet til Firestore");
    } catch (e) {
      console.error("[Sync] Upload fejlede:", e);
    }
  }, [docRef, profile, days, entries]);

  // Upload når data ændres (debounced)
  useEffect(() => {
    const t = setTimeout(upload, 2000);
    return () => clearTimeout(t);
  }, [upload]);

  // Lyt til ændringer fra Firestore
  useEffect(() => {
    if (!docRef) return;
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as SyncData;
      console.log("[Sync] Modtaget data fra Firestore");

      const remoteHash = JSON.stringify({ profile: data.profile, days: data.days, entries: data.entries });
      if (remoteHash === lastSyncRef.current) return;
      lastSyncRef.current = remoteHash;

      isRemoteUpdate.current = true;
      const state = useStore.getState();
      if (data.profile) state.setProfile(data.profile);
      if (data.days) useStore.setState({ days: data.days });
      if (data.entries) useStore.setState({ entries: data.entries });
      setTimeout(() => { isRemoteUpdate.current = false; }, 500);
    });
    return unsub;
  }, [docRef]);

  return { uid, syncing: !!docRef };
}
