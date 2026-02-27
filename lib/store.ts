"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, Entry, DiaryDay } from "./types";
import { format } from "date-fns";

interface AppState {
  profile: UserProfile | null;
  days: DiaryDay[];
  entries: Entry[];
  setProfile: (p: UserProfile) => void;
  ensureDay: (n: 1 | 2 | 3) => DiaryDay;
  addEntry: (e: Entry) => void;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: null, days: [], entries: [],
      setProfile: (p) => set({ profile: p }),
      ensureDay: (n) => {
        const ex = get().days.find((d) => d.dayNumber === n);
        if (ex) return ex;
        const d: DiaryDay = { id: crypto.randomUUID(), date: format(new Date(), "yyyy-MM-dd"), dayNumber: n, isTypicalDay: true };
        set((s) => ({ days: [...s.days, d] }));
        return d;
      },
      addEntry: (e) => set((s) => ({ entries: [...s.entries, e] })),
      updateEntry: (id, patch) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: "dagbog-store" }
  )
);
