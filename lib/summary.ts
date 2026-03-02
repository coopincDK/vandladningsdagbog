import type { Entry, DiaryDay, DaySummary, Flag, UserProfile } from "./types";

// Konverter HH:mm til minutter siden midnat
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Er et timestamp i natperioden (sengetid → opståtid)?
export function isNight(ts: string, p: UserProfile): boolean {
  const d = new Date(ts);
  const entryMin = d.getHours() * 60 + d.getMinutes();
  const sleepMin = toMin(p.sleepTime);
  const wakeMin = toMin(p.wakeTime);

  if (sleepMin > wakeMin) {
    // Nat går over midnat: f.eks. 22:00 → 07:00
    return entryMin >= sleepMin || entryMin < wakeMin;
  } else {
    // Nat inden for samme dag (usædvanligt men håndteres)
    return entryMin >= sleepMin && entryMin < wakeMin;
  }
}

export function computeSummary(entries: Entry[], _day: DiaryDay, profile: UserProfile): DaySummary {
  const voids = entries.filter((e) => e.type === "void" && e.voidMl != null);
  const intakes = entries.filter((e) => e.type === "intake" && e.intakeMl != null);
  const incs = entries.filter((e) => e.type === "incontinence");

  const totalIntakeMl = intakes.reduce((s, e) => s + (e.intakeMl ?? 0), 0);
  const totalVoidMl = voids.reduce((s, e) => s + (e.voidMl ?? 0), 0);

  const dayVoids = voids.filter((e) => !isNight(e.timestamp, profile)).length;
  const nightVoids = voids.filter((e) => isNight(e.timestamp, profile)).length;
  const nightMl = voids
    .filter((e) => isNight(e.timestamp, profile))
    .reduce((s, e) => s + (e.voidMl ?? 0), 0);

  const mls = voids.map((e) => e.voidMl ?? 0);
  const maxVoidMl = mls.length ? Math.max(...mls) : 0;
  const minVoidMl = mls.length ? Math.min(...mls) : 0;
  const nocturnalPolyuriaPct = totalVoidMl > 0 ? Math.round((nightMl / totalVoidMl) * 100) : 0;

  const urgencyScores = voids
    .filter((e) => e.urgencyScore != null)
    .map((e) => e.urgencyScore as number);
  const avgUrgency = urgencyScores.length
    ? Math.round((urgencyScores.reduce((a, b) => a + b, 0) / urgencyScores.length) * 10) / 10
    : 0;
  const highUrgencyCount = urgencyScores.filter((u) => u >= 3).length;

  const flags: Flag[] = [];

  // Polyuri
  if (totalVoidMl > 2800)
    flags.push({ key: "polyuri", label: `Samlet urinproduktion er ${totalVoidMl} ml — over grænsen på 2.800 ml/døgn.`, color: "orange" });

  // Natlig polyuri
  if (nocturnalPolyuriaPct > 33)
    flags.push({ key: "nocPoly", label: `Natlig urinproduktion udgør ${nocturnalPolyuriaPct}% af døgnets mængde — over grænsen på 33%.`, color: "orange" });

  // Nykturi
  if (nightVoids > 1)
    flags.push({ key: "nykturi", label: `${nightVoids} natlige vandladninger (nykturi). Mere end 1 er klinisk relevant.`, color: "yellow" });

  // Nedsat blærekapacitet
  if (maxVoidMl > 0 && maxVoidMl < 200)
    flags.push({ key: "nedsat", label: `Største vandladning er ${maxVoidMl} ml — under 200 ml tyder på nedsat blærekapacitet.`, color: "red" });

  // Hyppig vandladning
  if (dayVoids > 8)
    flags.push({ key: "hyppig", label: `${dayVoids} vandladninger i dagtimerne — over 8 er klinisk hyppigt.`, color: "yellow" });

  // Høj urgency
  if (highUrgencyCount > 0)
    flags.push({ key: "urgency", label: `${highUrgencyCount} vandladning${highUrgencyCount > 1 ? "er" : ""} med urgency ≥ 3 (stærk trang/kunne ikke holde).`, color: "orange" });

  // Inkontinens
  if (incs.length > 0)
    flags.push({ key: "inkontinens", label: `${incs.length} inkontinensepisode${incs.length > 1 ? "r" : ""} registreret.`, color: "red" });

  // Lav væskeindtag
  if (totalIntakeMl > 0 && totalIntakeMl < 1500)
    flags.push({ key: "lavIndtag", label: `Væskeindtag på ${totalIntakeMl} ml er under anbefalet minimum på 1.500 ml/døgn.`, color: "yellow" });

  return {
    totalIntakeMl, totalVoidMl, dayVoids, nightVoids,
    maxVoidMl, minVoidMl, nocturnalPolyuriaPct,
    incontinenceCount: incs.length, avgUrgency, flags,
  };
}
