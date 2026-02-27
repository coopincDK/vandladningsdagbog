"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { computeSummary } from "@/lib/summary";
import type { Flag } from "@/lib/types";

const FC: Record<string,string> = { yellow:"#f59e0b", orange:"#f97316", red:"#ef4444" };
const FB: Record<string,string> = { yellow:"#451a03", orange:"#431407", red:"#450a0a" };

export default function OpsummeringPage() {
  const { days, entries, profile } = useStore();
  const [dayNum, setDayNum] = useState<1|2|3>(1);
  if (!profile) return <div className="max-w-lg mx-auto px-4 py-8 text-center"><p className="text-[var(--muted)]">Udfyld din profil først</p></div>;
  const day = days.find((d) => d.dayNumber === dayNum);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Overblik</h1>
      <div className="flex gap-2 mb-6">{([1,2,3] as const).map((n) => (<button key={n} onClick={() => setDayNum(n)} className="flex-1 py-3 rounded-xl border-2 text-lg font-semibold" style={{ background:dayNum===n?"var(--accent)":"var(--surface)", borderColor:dayNum===n?"var(--accent)":"var(--border)", color:dayNum===n?"#fff":"var(--text)" }}>Dag {n}</button>))}</div>
      {!day ? <div className="rounded-2xl p-8 text-center" style={{ background:"var(--surface)", border:"2px dashed var(--border)" }}><p className="text-5xl mb-3">📊</p><p className="text-[var(--muted)]">Ingen data for dag {dayNum}</p></div> : (() => {
        const de = entries.filter((e) => e.dayId === day.id);
        const s = computeSummary(de, day, profile);
        return <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Stat label="Væskeindtag" value={s.totalIntakeMl} unit="ml" />
            <Stat label="Urinproduktion" value={s.totalVoidMl} unit="ml" />
            <Stat label="Vandladninger (dag)" value={s.dayVoids} />
            <Stat label="Vandladninger (nat)" value={s.nightVoids} />
            <Stat label="Største vandladning" value={s.maxVoidMl} unit="ml" />
            <Stat label="Mindste vandladning" value={s.minVoidMl||"–"} />
            <Stat label="Natlig polyuri-index" value={`${s.nocturnalPolyuriaPct}%`} />
            <Stat label="Gns. urgency" value={s.avgUrgency} />
          </div>
          {s.flags.length > 0 && <div className="space-y-3 mb-6">{s.flags.map((f) => <div key={f.key} className="rounded-xl p-4" style={{ background:FB[f.color], border:`1px solid ${FC[f.color]}` }}><p className="text-sm" style={{ color:FC[f.color] }}>⚠️ {f.label}</p></div>)}</div>}
          {s.flags.length === 0 && de.length > 0 && <div className="rounded-xl p-4" style={{ background:"var(--surface)", border:"1px solid var(--success)" }}><p className="text-sm" style={{ color:"var(--success)" }}>✅ Ingen kliniske flag</p></div>}
        </>;
      })()}
      <p className="text-xs text-[var(--muted)] mt-6 text-center">Appen stiller ingen diagnoser. Drøft fund med din læge.</p>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string|number; unit?: string }) {
  return <div className="rounded-xl p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}><p className="text-xs text-[var(--muted)] uppercase">{label}</p><p className="text-2xl font-bold">{value}{unit && <span className="text-sm font-normal text-[var(--muted)] ml-1">{unit}</span>}</p></div>;
}
