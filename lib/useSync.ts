"use client";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useStore } from "./store";
import { useAuth } from "./useAuth";

interface SyncData {
  profile: import("./types").UserProfile | null;
  days: import("./types").DiaryDay[];
  entries: import("./types").Entry[];
  updatedAt: string;
}

// Hent eller opret sync-room ID fra localStorage
function getSyncRoom(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sync-room");
}

function setSyncRoom(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sync-room", id);
}

export function createSyncRoom(): string {
  // Generer et kort, menneskevenligt ID
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  setSyncRoom(id);
  return id;
}

export function joinSyncRoom(id: string) {
  setSyncRoom(id);
}

export function leaveSyncRoom() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("sync-room");
}

export function useSync() {
  const { uid } = useAuth();
  const profile = useStore((s) => s.profile);
  const days = useStore((s) => s.days);
  const entries = useStore((s) => s.entries);
  const lastSyncRef = useRef<string>("");
  const isRemoteUpdate = useRef(false);
  const roomId = typeof window !== "undefined" ? getSyncRoom() : null;

  const docRef = useMemo(() => roomId ? doc(db, "rooms", roomId) : null, [roomId]);

  // Upload til Firestore
  const upload = useCallback(async () => {
    if (!docRef || isRemoteUpdate.current) return;

    const clean = (obj: unknown): unknown => JSON.parse(JSON.stringify(obj));
    const data: SyncData = clean({
      profile, days, entries,
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
      if (data.days?.length) useStore.setState({ days: data.days });
      if (data.entries?.length) useStore.setState({ entries: data.entries });
      setTimeout(() => { isRemoteUpdate.current = false; }, 500);
    });
    return unsub;
  }, [docRef]);

  return { uid, roomId, syncing: !!docRef };
}
