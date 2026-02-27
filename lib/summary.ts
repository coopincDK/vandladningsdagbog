import type { Entry, DiaryDay, DaySummary, Flag, UserProfile } from "./types";

function isNight(ts: string, p: UserProfile): boolean {
  const d = new Date(ts);
  const hhmm = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  if (p.sleepTime > p.wakeTime) return hhmm >= p.sleepTime || hhmm < p.wakeTime;
  return hhmm >= p.sleepTime && hhmm < p.wakeTime;
}

export function computeSummary(entries: Entry[], _day: DiaryDay, profile: UserProfile): DaySummary {
  const voids = entries.filter((e) => e.type === "void" && e.voidMl != null);
  const intakes = entries.filter((e) => e.type === "intake" && e.intakeMl != null);
  const incs = entries.filter((e) => e.type === "incontinence");
  const totalIntakeMl = intakes.reduce((s, e) => s + (e.intakeMl ?? 0), 0);
  const totalVoidMl = voids.reduce((s, e) => s + (e.voidMl ?? 0), 0);
  const dayVoids = voids.filter((e) => !isNight(e.timestamp, profile)).length;
  const nightVoids = voids.filter((e) => isNight(e.timestamp, profile)).length;
  const nightMl = voids.filter((e) => isNight(e.timestamp, profile)).reduce((s, e) => s + (e.voidMl ?? 0), 0);
  const mls = voids.map((e) => e.voidMl ?? 0);
  const maxVoidMl = mls.length ? Math.max(...mls) : 0;
  const minVoidMl = mls.length ? Math.min(...mls) : 0;
  const nocturnalPolyuriaPct = totalVoidMl > 0 ? Math.round((nightMl / totalVoidMl) * 100) : 0;
  const us = voids.filter((e) => e.urgencyScore != null).map((e) => e.urgencyScore as number);
  const avgUrgency = us.length ? Math.round((us.reduce((a, b) => a + b, 0) / us.length) * 10) / 10 : 0;
  const flags: Flag[] = [];
  if (totalVoidMl > 2800) flags.push({ key: "polyuri", label: `Samlet urinproduktion er ${totalVoidMl} ml (grænse: 2.800 ml/døgn).`, color: "orange" });
  if (nocturnalPolyuriaPct > 33) flags.push({ key: "nocPoly", label: `Natlig urinproduktion udgør ${nocturnalPolyuriaPct}% af døgnets mængde.`, color: "orange" });
  if (nightVoids > 1) flags.push({ key: "nykturi", label: `${nightVoids} natlige vandladninger (nykturi).`, color: "yellow" });
  if (maxVoidMl > 0 && maxVoidMl < 200) flags.push({ key: "nedsat", label: `Største vandladning er ${maxVoidMl} ml (nedsat kapacitet).`, color: "red" });
  if (dayVoids > 8) flags.push({ key: "hyppig", label: `${dayVoids} vandladninger i dagtimerne (hyppig).`, color: "yellow" });
  return { totalIntakeMl, totalVoidMl, dayVoids, nightVoids, maxVoidMl, minVoidMl, nocturnalPolyuriaPct, incontinenceCount: incs.length, avgUrgency, flags };
}
