import type { Sex } from "./types";
const M = [[5,14,9.6],[16,29,13],[30,39,13],[40,49,13],[50,59,11],[60,69,8.5],[70,79,7.5],[80,999,6.5]];
const F = [[5,14,11.3],[16,44,12],[45,54,11],[55,999,10.2]];
export function getQavg(sex: Sex, birthYear: number): number {
  const age = new Date().getFullYear() - birthYear;
  const t = sex === "male" ? M : F;
  const e = t.find(([lo, hi]) => age >= lo && age <= hi);
  return e ? e[2] : 10;
}
export function estimateVolume(sex: Sex, birthYear: number, seconds: number): number {
  return Math.round(getQavg(sex, birthYear) * seconds);
}
