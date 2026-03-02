"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { computeSummary, isNight } from "@/lib/summary";
import { format } from "date-fns";
import type { Entry, UserProfile } from "@/lib/types";
import { MAX_DAYS } from "@/lib/dayUtils";

const FC: Record<string,string> = { yellow:"#f59e0b", orange:"#f97316", red:"#ef4444" };
const FB: Record<string,string> = { yellow:"#451a03", orange:"#431407", red:"#450a0a" };

// ── Tidslinje-diagram ──────────────────────────────────────────────
function TimelineChart({ entries, profile }: { entries: Entry[]; profile: UserProfile }) {
  const voids = entries.filter((e) => e.type === "void" && e.voidMl);
  const intakes = entries.filter((e) => e.type === "intake" && e.intakeMl);
  if (voids.length === 0 && intakes.length === 0) return null;

  // Byg 24 timers slots (hver time)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const wakeH = parseInt(profile.wakeTime.split(":")[0]);
  const sleepH = parseInt(profile.sleepTime.split(":")[0]);

  const voidByHour = hours.map((h) =>
    voids.filter((e) => new Date(e.timestamp).getHours() === h)
      .reduce((s, e) => s + (e.voidMl ?? 0), 0)
  );
  const intakeByHour = hours.map((h) =>
    intakes.filter((e) => new Date(e.timestamp).getHours() === h)
      .reduce((s, e) => s + (e.intakeMl ?? 0), 0)
  );

  const maxVal = Math.max(...voidByHour, ...intakeByHour, 1);

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold mb-3">📊 Fordeling over døgnet</p>
      <div className="flex items-end gap-0.5 h-24 mb-1">
        {hours.map((h) => {
          const isNightHour = sleepH > wakeH
            ? h >= sleepH || h < wakeH
            : h >= sleepH && h < wakeH;
          const vH = (voidByHour[h] / maxVal) * 100;
          const iH = (intakeByHour[h] / maxVal) * 100;
          return (
            <div key={h} className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full relative">
              {isNightHour && (
                <div className="absolute inset-0 rounded-sm opacity-20" style={{ background: "#6366f1" }} />
              )}
              {iH > 0 && (
                <div className="w-full rounded-t-sm" style={{ height: `${iH}%`, background: "#22d3ee", minHeight: 2 }} />
              )}
              {vH > 0 && (
                <div className="w-full rounded-t-sm" style={{ height: `${vH}%`, background: "var(--accent)", minHeight: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs mb-2" style={{ color: "var(--muted)" }}>
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
      <div className="flex gap-4 text-xs" style={{ color: "var(--muted)" }}>
        <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: "var(--accent)", verticalAlign: "middle" }} />Vandladning</span>
        <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: "#22d3ee", verticalAlign: "middle" }} />Væske</span>
        <span><span className="inline-block w-3 h-3 rounded-sm mr-1 opacity-40" style={{ background: "#6366f1", verticalAlign: "middle" }} />Nat</span>
      </div>
    </div>
  );
}

// ── Urgency fordeling ──────────────────────────────────────────────
function UrgencyChart({ entries }: { entries: Entry[] }) {
  const voids = entries.filter((e) => e.type === "void" && e.urgencyScore != null);
  if (voids.length === 0) return null;
  const counts = [0,1,2,3,4].map((n) => voids.filter((e) => e.urgencyScore === n).length);
  const max = Math.max(...counts, 1);
  const colors = ["#22c55e","#84cc16","#f59e0b","#f97316","#ef4444"];
  const labels = ["Ingen","Svag","Moderat","Stærk","Kunne ikke holde"];

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold mb-3">🌡️ Urgency fordeling</p>
      <div className="space-y-2">
        {[0,1,2,3,4].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <span className="text-xs w-4 font-bold" style={{ color: colors[n] }}>{n}</span>
            <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(counts[n]/max)*100}%`, background: colors[n], minWidth: counts[n] > 0 ? 8 : 0 }} />
            </div>
            <span className="text-xs w-16" style={{ color: "var(--muted)" }}>{labels[n]}</span>
            <span className="text-xs font-bold w-4">{counts[n]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vandladnings-størrelser ────────────────────────────────────────
function VoidSizeChart({ entries }: { entries: Entry[] }) {
  const voids = entries.filter((e) => e.type === "void" && e.voidMl).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
  if (voids.length === 0) return null;
  const max = Math.max(...voids.map((e) => e.voidMl ?? 0), 1);

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold mb-3">💧 Vandladningsstørrelser over tid</p>
      <div className="flex items-end gap-1 h-20">
        {voids.map((e, i) => {
          const pct = ((e.voidMl ?? 0) / max) * 100;
          const isEst = e.isEstimated;
          return (
            <div key={e.id} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              <div className="w-full rounded-t-sm" style={{
                height: `${pct}%`,
                background: isEst ? "#f59e0b" : "var(--accent)",
                minHeight: 4,
                opacity: 0.85,
              }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs mt-1" style={{ color: "var(--muted)" }}>
        <span>Første</span><span>Sidst</span>
      </div>
      <div className="flex gap-4 text-xs mt-1" style={{ color: "var(--muted)" }}>
        <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: "var(--accent)", verticalAlign: "middle" }} />Målt</span>
        <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: "#f59e0b", verticalAlign: "middle" }} />Estimeret</span>
      </div>
    </div>
  );
}

// ── Tværgående sammenligning ───────────────────────────────────────
function CrossDayComparison({ allDays, allEntries, profile }: { allDays: import("@/lib/types").DiaryDay[]; allEntries: Entry[]; profile: UserProfile }) {
  const days = [1,2,3] as const;
  const summaries = days.map((n) => {
    const day = allDays.find((d) => d.dayNumber === n);
    if (!day) return null;
    const de = allEntries.filter((e) => e.dayId === day.id);
    if (de.length === 0) return null;
    return { n, s: computeSummary(de, day, profile) };
  }).filter(Boolean) as { n: number; s: ReturnType<typeof computeSummary> }[];

  if (summaries.length < 2) return null;

  const maxVoid = Math.max(...summaries.map((x) => x.s.totalVoidMl), 1);
  const maxIntake = Math.max(...summaries.map((x) => x.s.totalIntakeMl), 1);

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold mb-3">📈 Sammenligning dag 1–3</p>
      <div className="space-y-3">
        {summaries.map(({ n, s }) => (
          <div key={n}>
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
              <span className="font-semibold" style={{ color: "var(--text)" }}>Dag {n}</span>
              <span>{s.totalVoidMl} ml urin · {s.totalIntakeMl} ml væske · {s.dayVoids+s.nightVoids} vandladninger</span>
            </div>
            <div className="flex gap-1 h-4">
              <div className="rounded-full" style={{ width: `${(s.totalVoidMl/maxVoid)*60}%`, background: "var(--accent)", minWidth: 4 }} />
              <div className="rounded-full" style={{ width: `${(s.totalIntakeMl/maxIntake)*40}%`, background: "#22d3ee", minWidth: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs mt-3" style={{ color: "var(--muted)" }}>
        <span><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: "var(--accent)", verticalAlign: "middle" }} />Urin</span>
        <span><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: "#22d3ee", verticalAlign: "middle" }} />Væske</span>
      </div>
    </div>
  );
}

// ── Insights tekst ─────────────────────────────────────────────────
function Insights({ entries, profile }: { entries: Entry[]; profile: UserProfile }) {
  const voids = entries.filter((e) => e.type === "void" && e.voidMl);
  const intakes = entries.filter((e) => e.type === "intake" && e.intakeMl);
  if (voids.length === 0) return null;

  const insights: string[] = [];

  // Blærekapacitet
  const maxVoid = Math.max(...voids.map((e) => e.voidMl ?? 0));
  const minVoid = Math.min(...voids.map((e) => e.voidMl ?? 0));
  if (maxVoid >= 400) insights.push(`✅ God blærekapacitet — største vandladning er ${maxVoid} ml (normalt ≥ 300 ml).`);
  else if (maxVoid >= 200) insights.push(`⚠️ Moderat blærekapacitet — største vandladning er ${maxVoid} ml.`);

  // Interval mellem vandladninger
  if (voids.length >= 2) {
    const sorted = [...voids].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    const dayVoids = sorted.filter((e) => !isNight(e.timestamp, profile));
    if (dayVoids.length >= 2) {
      const intervals = dayVoids.slice(1).map((e, i) => {
        const diff = new Date(e.timestamp).getTime() - new Date(dayVoids[i].timestamp).getTime();
        return diff / 60000; // minutter
      });
      const avgInterval = Math.round(intervals.reduce((a,b) => a+b, 0) / intervals.length);
      if (avgInterval < 60) insights.push(`⚠️ Gennemsnitligt interval mellem vandladninger er ${avgInterval} min — under 1 time kan indikere overaktiv blære.`);
      else insights.push(`✅ Gennemsnitligt interval mellem vandladninger: ${avgInterval} min.`);
    }
  }

  // Væske/urin ratio
  const totalVoid = voids.reduce((s,e) => s + (e.voidMl ?? 0), 0);
  const totalIntake = intakes.reduce((s,e) => s + (e.intakeMl ?? 0), 0);
  if (totalIntake > 0 && totalVoid > 0) {
    const ratio = Math.round((totalVoid / totalIntake) * 100);
    if (ratio > 110) insights.push(`💡 Urinproduktion (${totalVoid} ml) er markant højere end registreret væskeindtag (${totalIntake} ml) — muligvis ikke alt væske registreret.`);
    else if (ratio < 50) insights.push(`💡 Urinproduktion (${totalVoid} ml) er meget lavere end væskeindtag (${totalIntake} ml) — kan være normalt ved svedtab.`);
    else insights.push(`✅ Væske/urin-balance ser fornuftig ud (${totalIntake} ml ind · ${totalVoid} ml ud).`);
  }

  // Estimerede vs målte
  const estimated = voids.filter((e) => e.isEstimated).length;
  if (estimated > 0) insights.push(`📏 ${estimated} af ${voids.length} vandladninger er estimerede (ikke målt med bæger).`);

  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold mb-3">💡 Indsigter</p>
      <div className="space-y-2">
        {insights.map((ins, i) => (
          <p key={i} className="text-sm" style={{ color: "var(--text)" }}>{ins}</p>
        ))}
      </div>
    </div>
  );
}

// ── Hoved-side ─────────────────────────────────────────────────────
export default function OpsummeringPage() {
  const { days, entries, profile } = useStore();
  const [dayNum, setDayNum] = useState<number>(1);
  const maxDayNum = Math.max(MAX_DAYS, ...days.map((d) => d.dayNumber), dayNum);

  if (!profile) return (
    <div className="max-w-lg mx-auto px-4 py-8 text-center">
      <p className="text-[var(--muted)]">Udfyld din profil først</p>
    </div>
  );

  const day = days.find((d) => d.dayNumber === dayNum);
  const de = day ? entries.filter((e) => e.dayId === day.id) : [];
  const s = day && de.length > 0 ? computeSummary(de, day, profile) : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Overblik</h1>

      {/* Dag-tabs — scrollbar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {Array.from({ length: maxDayNum }, (_, i) => i + 1).map((n) => {
          const hasData = days.some((d) => d.dayNumber === n && entries.some((e) => e.dayId === d.id));
          return (
            <button key={n} onClick={() => setDayNum(n)}
              className="flex-shrink-0 px-4 py-2 rounded-xl border-2 text-base font-semibold"
              style={{ background: dayNum===n?"var(--accent)":"var(--surface)", borderColor: dayNum===n?"var(--accent)":"var(--border)", color: dayNum===n?"#fff":hasData?"var(--text)":"var(--muted)", minWidth: "4rem" }}>
              Dag {n}
            </button>
          );
        })}
      </div>

      {!day || de.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background:"var(--surface)", border:"2px dashed var(--border)" }}>
          <p className="text-5xl mb-3">📊</p>
          <p className="text-[var(--muted)]">Ingen data for dag {dayNum}</p>
        </div>
      ) : (
        <>
          {/* Nøgletal */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Stat label="Væskeindtag" value={s!.totalIntakeMl} unit="ml" />
            <Stat label="Urinproduktion" value={s!.totalVoidMl} unit="ml" />
            <Stat label="Vandladninger dag" value={s!.dayVoids} />
            <Stat label="Vandladninger nat" value={s!.nightVoids} />
            <Stat label="Største vandladning" value={s!.maxVoidMl} unit="ml" />
            <Stat label="Mindste vandladning" value={s!.minVoidMl || "–"} unit={s!.minVoidMl ? "ml" : undefined} />
            <Stat label="Natlig polyuri-index" value={`${s!.nocturnalPolyuriaPct}%`} />
            <Stat label="Gns. urgency" value={s!.avgUrgency} />
          </div>

          {/* Diagrammer */}
          <TimelineChart entries={de} profile={profile} />
          <VoidSizeChart entries={de} />
          <UrgencyChart entries={de} />

          {/* Indsigter */}
          <Insights entries={de} profile={profile} />

          {/* Flags */}
          {s!.flags.length > 0 && (
            <div className="space-y-3 mb-4">
              {s!.flags.map((f) => (
                <div key={f.key} className="rounded-xl p-4" style={{ background: FB[f.color], border: `1px solid ${FC[f.color]}` }}>
                  <p className="text-sm" style={{ color: FC[f.color] }}>⚠️ {f.label}</p>
                </div>
              ))}
            </div>
          )}
          {s!.flags.length === 0 && (
            <div className="rounded-xl p-4 mb-4" style={{ background:"var(--surface)", border:"1px solid var(--success)" }}>
              <p className="text-sm" style={{ color:"var(--success)" }}>✅ Ingen kliniske flag for dag {dayNum}</p>
            </div>
          )}

          {/* Tværgående sammenligning */}
          <CrossDayComparison allDays={days} allEntries={entries} profile={profile} />
        </>
      )}

      <p className="text-xs text-[var(--muted)] mt-4 text-center">Appen stiller ingen diagnoser. Drøft fund med din læge.</p>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string|number; unit?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
      <p className="text-xs uppercase mb-1" style={{ color:"var(--muted)" }}>{label}</p>
      <p className="text-2xl font-bold">
        {value}
        {unit && <span className="text-sm font-normal ml-1" style={{ color:"var(--muted)" }}>{unit}</span>}
      </p>
    </div>
  );
}
