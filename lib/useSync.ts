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

// Merge entries: behold alle unikke id'er, remote vinder ved konflikt (nyeste updatedAt)
function mergeEntries(
  local: import("./types").Entry[],
  remote: import("./types").Entry[]
): import("./types").Entry[] {
  const map = new Map<string, import("./types").Entry>();
  for (const e of local) map.set(e.id, e);
  for (const e of remote) map.set(e.id, e); // remote overskriver ved samme id
  return Array.from(map.values());
}

function mergeDays(
  local: import("./types").DiaryDay[],
  remote: import("./types").DiaryDay[]
): import("./types").DiaryDay[] {
  const map = new Map<string, import("./types").DiaryDay>();
  for (const d of local) map.set(d.id, d);
  for (const d of remote) map.set(d.id, d);
  return Array.from(map.values());
}

export function useSync() {
  const { uid } = useAuth();
  const profile = useStore((s) => s.profile);
  const days = useStore((s) => s.days);
  const entries = useStore((s) => s.entries);
  const lastUploadHash = useRef<string>("");
  const isApplyingRemote = useRef(false);
  const roomId = typeof window !== "undefined" ? getSyncRoom() : null;

  const docRef = useMemo(() => roomId ? doc(db, "rooms", roomId) : null, [roomId]);

  // Upload til Firestore (debounced 2s)
  const upload = useCallback(async () => {
    if (!docRef || isApplyingRemote.current) return;

    const clean = (obj: unknown): unknown => JSON.parse(JSON.stringify(obj));
    const data: SyncData = clean({
      profile, days, entries,
      updatedAt: new Date().toISOString(),
    }) as SyncData;

    const hash = JSON.stringify({ profile, days, entries });
    if (hash === lastUploadHash.current) return;
    lastUploadHash.current = hash;

    try {
      await setDoc(docRef, data, { merge: true });
      console.log("[Sync] Uploadet til Firestore");
    } catch (e) {
      console.error("[Sync] Upload fejlede:", e);
    }
  }, [docRef, profile, days, entries]);

  // Upload når data ændres
  useEffect(() => {
    const t = setTimeout(upload, 2000);
    return () => clearTimeout(t);
  }, [upload]);

  // Lyt til ændringer fra Firestore (2-vejs sync)
  useEffect(() => {
    if (!docRef) return;
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as SyncData;

      // Sammenlign med hvad vi sidst uploadede — undgå echo-loop
      const remoteHash = JSON.stringify({
        profile: data.profile,
        days: data.days,
        entries: data.entries,
      });
      if (remoteHash === lastUploadHash.current) return;

      console.log("[Sync] Modtaget data fra Firestore — merger...");
      isApplyingRemote.current = true;

      const state = useStore.getState();
      const currentDays = state.days;
      const currentEntries = state.entries;

      // Sæt profil hvis remote har en
      if (data.profile) {
        state.setProfile(data.profile);
      }

      // Merge days (behold alle unikke, remote vinder ved konflikt)
      const mergedDays = mergeDays(currentDays, data.days ?? []);
      useStore.setState({ days: mergedDays });

      // Merge entries (behold alle unikke, remote vinder ved konflikt)
      const mergedEntries = mergeEntries(currentEntries, data.entries ?? []);
      useStore.setState({ entries: mergedEntries });

      // Opdater hash så vi ikke re-uploader det vi netop fik
      lastUploadHash.current = JSON.stringify({
        profile: data.profile ?? state.profile,
        days: mergedDays,
        entries: mergedEntries,
      });

      // Frigiv flag efter kort delay
      setTimeout(() => {
        isApplyingRemote.current = false;
      }, 1000);
    });
    return unsub;
  }, [docRef]);

  return { uid, roomId, syncing: !!docRef };
}
