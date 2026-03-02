import type { Entry, DiaryDay, UserProfile } from "./types";

// Konverter HH:mm til minutter siden midnat
function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Lokal dato som YYYY-MM-DD (undgår UTC-forskydning)
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Givet et timestamp: returner den "justerede dato" (YYYY-MM-DD) i lokal tid
// Nat-timer før opståtid hører til forrige dag
export function adjustedDate(ts: string, wakeTime: string): string {
  const d = new Date(ts);
  const entryMin = d.getHours() * 60 + d.getMinutes(); // lokal tid
  const wakeMin = hhmmToMin(wakeTime);
  if (entryMin < wakeMin) {
    // Hører til forrige dag — træk én dag fra
    d.setDate(d.getDate() - 1);
  }
  return localDateStr(d);
}

// Find alle unikke dag-datoer sorteret
export function uniqueDayDates(entries: Entry[], wakeTime: string): string[] {
  return Array.from(new Set(entries.map((e) => adjustedDate(e.timestamp, wakeTime)))).sort();
}

// Beregn dag-nummer (1-baseret) for et givet timestamp
export function assignDayNumber(ts: string, entries: Entry[], wakeTime: string): number {
  const dates = uniqueDayDates(entries, wakeTime);
  const adj = adjustedDate(ts, wakeTime);
  const idx = dates.indexOf(adj);
  return idx === -1 ? dates.length + 1 : idx + 1;
}

// Beregn hvilken dag vi er på NU baseret på opståtid og eksisterende entries
export function currentDayNumber(days: DiaryDay[], entries: Entry[], profile: UserProfile): number {
  if (entries.length === 0) return 1;

  const wakeMin = hhmmToMin(profile.wakeTime);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Justeret dato for nu i lokal tid
  const adjustedNow = new Date(now);
  if (nowMin < wakeMin) adjustedNow.setDate(adjustedNow.getDate() - 1);
  const todayAdj = localDateStr(adjustedNow);

  // Find alle unikke justerede datoer fra eksisterende entries
  const dates = uniqueDayDates(entries, profile.wakeTime);

  // Er dagens dato allerede i listen?
  const idx = dates.indexOf(todayAdj);
  if (idx !== -1) return idx + 1;

  // Ny dag — næste dag-nummer
  return dates.length + 1;
}

// Maks antal dage (kan justeres)
export const MAX_DAYS = 7;
