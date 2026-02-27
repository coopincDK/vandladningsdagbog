"use client";
import { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { estimateVolume } from "@/lib/qavg";
import type { BeverageType, IncontinenceSeverity } from "@/lib/types";
import { format } from "date-fns";

type Mode = "home" | "void-timer" | "void-manual" | "intake";
const BEVERAGES: { type: BeverageType; icon: string; label: string }[] = [
  { type:"vand",icon:"💧",label:"Vand" },{ type:"kaffe",icon:"☕",label:"Kaffe" },{ type:"te",icon:"🍵",label:"Te" },
  { type:"juice",icon:"🍊",label:"Juice" },{ type:"alkohol",icon:"🍺",label:"Alkohol" },{ type:"sodavand",icon:"🥤",label:"Sodavand" },{ type:"andet",icon:"🫙",label:"Andet" },
];
const QUICK_ML = [150, 200, 250, 330, 500];
const URGENCY_LABELS = ["0 – Ingen trang","1 – Svag","2 – Moderat","3 – Stærk","4 – Kunne ikke holde"];
const SEVERITY_OPTIONS: { value: IncontinenceSeverity; label: string }[] = [
  { value:"dry",label:"Tørt" },{ value:"damp",label:"Lidt fugtigt" },{ value:"wet",label:"Vådt" },{ value:"soaked",label:"Gennemblødt" },
];
const nowHHMM = () => format(new Date(), "HH:mm");
const timeToISO = (hhmm: string) => { const [h,m] = hhmm.split(":").map(Number); const d = new Date(); d.setHours(h,m,0,0); return d.toISOString(); };

export default function RegistrerPage() {
  const { profile, ensureDay, addEntry } = useStore();
  const [mode, setMode] = useState<Mode>("home");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [estimated, setEstimated] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timestamp, setTimestamp] = useState(nowHHMM());
  const [voidMl, setVoidMl] = useState("");
  const [urgency, setUrgency] = useState(0);
  const [hasInc, setHasInc] = useState(false);
  const [severity, setSeverity] = useState<IncontinenceSeverity>("damp");
  const [activity, setActivity] = useState("");
  const [note, setNote] = useState("");
  const [beverage, setBeverage] = useState<BeverageType>("vand");
  const [intakeMl, setIntakeMl] = useState<number | null>(null);
  const [customMl, setCustomMl] = useState("");

  useEffect(() => {
    if (running) { intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000); }
    else { if (intervalRef.current) clearInterval(intervalRef.current); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  function resetAll() { setMode("home"); setRunning(false); setElapsed(0); setEstimated(null); setVoidMl(""); setUrgency(0); setHasInc(false); setActivity(""); setNote(""); setIntakeMl(null); setCustomMl(""); setTimestamp(nowHHMM()); }

  function startTimer() { setElapsed(0); setEstimated(null); setTimestamp(nowHHMM()); setRunning(true); setMode("void-timer"); }
  function stopTimer() { setRunning(false); if (profile) { const est = estimateVolume(profile.sex, profile.birthYear, elapsed); setEstimated(est); setVoidMl(String(est)); } }

  function saveVoid(isEst: boolean) {
    const day = ensureDay(1);
    addEntry({ id: crypto.randomUUID(), dayId: day.id, timestamp: timeToISO(timestamp), type: "void", voidMl: Number(voidMl), isEstimated: isEst, durationSeconds: isEst ? elapsed : undefined, urgencyScore: urgency, note: note.trim() || undefined });
    if (hasInc) addEntry({ id: crypto.randomUUID(), dayId: day.id, timestamp: timeToISO(timestamp), type: "incontinence", severity, activity });
    resetAll();
  }

  function saveIntake() {
    const ml = intakeMl ?? Number(customMl); if (!ml) return;
    const day = ensureDay(1);
    addEntry({ id: crypto.randomUUID(), dayId: day.id, timestamp: timeToISO(timestamp), type: "intake", beverageType: beverage, intakeMl: ml, note: note.trim() || undefined });
    resetAll();
  }

  if (!profile) return <div className="max-w-lg mx-auto px-4 py-8 text-center"><p style={{ color:"var(--muted)" }}>Udfyld din profil først</p><a href="/vandladningsdagbog/profil" className="underline" style={{ color:"var(--accent)" }}>Gå til profil</a></div>;

  if (mode === "home") return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Registrer</h1>
        <a href="/vandladningsdagbog/profil" className="text-sm px-3 py-2 rounded-xl" style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--muted)" }}>👤 Profil</a>
      </div>
      <div className="space-y-4">
        <button onClick={startTimer} className="w-full py-8 rounded-2xl text-2xl font-bold flex flex-col items-center gap-2 active:scale-95 transition-transform" style={{ background:"var(--accent)", color:"#fff" }}>
          <span className="text-5xl">💧</span>Start vandladning<span className="text-sm font-normal opacity-80">Timer-baseret estimat</span>
        </button>
        <button onClick={() => { setTimestamp(nowHHMM()); setMode("void-manual"); }} className="w-full py-5 rounded-2xl text-xl font-semibold flex items-center justify-center gap-3 active:scale-95" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }}>🧪 Registrer med målbæger</button>
        <button onClick={() => { setTimestamp(nowHHMM()); setMode("intake"); }} className="w-full py-5 rounded-2xl text-xl font-semibold flex items-center justify-center gap-3 active:scale-95" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }}>🥛 Registrer drik</button>
      </div>
    </div>
  );

  if (mode === "void-timer") return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-2">Vandladning</h1>
      <div className="w-56 h-56 rounded-full flex items-center justify-center my-8" style={{ background:"var(--surface)", border:`4px solid ${running?"var(--accent)":"var(--border)"}` }}>
        <span className="text-6xl font-mono font-bold">{fmtTime(elapsed)}</span>
      </div>
      {running ? <button onClick={stopTimer} className="w-full py-6 rounded-2xl text-2xl font-bold" style={{ background:"var(--danger)", color:"#fff" }}>⏹ Stop</button> : (
        <div className="w-full space-y-4">
          {estimated !== null && <div className="rounded-2xl p-5 text-center" style={{ background:"var(--surface)", border:"2px solid var(--accent)" }}><p className="text-4xl font-bold" style={{ color:"var(--accent)" }}>ca. {estimated} ml</p><p className="text-xs text-[var(--muted)] mt-1">Estimeret — ikke målt</p></div>}
          <TimeField value={timestamp} onChange={setTimestamp} />
          <div><label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Mængde (ml)</label><input type="number" value={voidMl} onChange={(e) => setVoidMl(e.target.value)} className="w-full rounded-xl px-4 py-4 text-2xl font-bold text-center" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} /></div>
          <UrgencyPicker value={urgency} onChange={setUrgency} />
          <IncSection has={hasInc} setHas={setHasInc} severity={severity} setSeverity={setSeverity} activity={activity} setActivity={setActivity} />
          <NoteField value={note} onChange={setNote} />
          <div className="flex gap-3"><button onClick={resetAll} className="flex-1 py-4 rounded-2xl text-lg font-semibold" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--muted)" }}>Annuller</button><button onClick={() => saveVoid(estimated !== null)} className="flex-grow py-4 rounded-2xl text-lg font-bold" style={{ background:"var(--accent)", color:"#fff" }}>Gem ✓</button></div>
        </div>
      )}
    </div>
  );

  if (mode === "void-manual") return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={resetAll} className="text-[var(--muted)] mb-4">← Tilbage</button>
      <h1 className="text-2xl font-bold mb-6">Vandladning med målbæger</h1>
      <div className="space-y-4">
        <TimeField value={timestamp} onChange={setTimestamp} />
        <div><label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Mængde (ml)</label><input type="number" value={voidMl} onChange={(e) => setVoidMl(e.target.value)} placeholder="f.eks. 250" className="w-full rounded-xl px-4 py-4 text-2xl font-bold text-center" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} /></div>
        <UrgencyPicker value={urgency} onChange={setUrgency} />
        <IncSection has={hasInc} setHas={setHasInc} severity={severity} setSeverity={setSeverity} activity={activity} setActivity={setActivity} />
        <NoteField value={note} onChange={setNote} />
        <div className="flex gap-3"><button onClick={resetAll} className="flex-1 py-4 rounded-2xl text-lg font-semibold" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--muted)" }}>Annuller</button><button onClick={() => saveVoid(false)} disabled={!voidMl} className="flex-grow py-4 rounded-2xl text-lg font-bold disabled:opacity-40" style={{ background:"var(--accent)", color:"#fff" }}>Gem ✓</button></div>
      </div>
    </div>
  );

  if (mode === "intake") return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={resetAll} className="text-[var(--muted)] mb-4">← Tilbage</button>
      <h1 className="text-2xl font-bold mb-6">Registrer drik</h1>
      <div className="space-y-4">
        <TimeField value={timestamp} onChange={setTimestamp} />
        <div><label className="block text-sm font-semibold text-[var(--muted)] mb-3 uppercase">Type</label>
          <div className="grid grid-cols-4 gap-3">{BEVERAGES.map((b) => (<button key={b.type} onClick={() => setBeverage(b.type)} className="flex flex-col items-center gap-1 py-3 rounded-xl border-2" style={{ background:beverage===b.type?"var(--accent)":"var(--surface)", borderColor:beverage===b.type?"var(--accent)":"var(--border)" }}><span className="text-3xl">{b.icon}</span><span className="text-xs">{b.label}</span></button>))}</div>
        </div>
        <div><label className="block text-sm font-semibold text-[var(--muted)] mb-3 uppercase">Mængde</label>
          <div className="grid grid-cols-5 gap-2 mb-3">{QUICK_ML.map((ml) => (<button key={ml} onClick={() => { setIntakeMl(ml); setCustomMl(""); }} className="py-3 rounded-xl border-2 text-sm font-bold" style={{ background:intakeMl===ml?"var(--accent)":"var(--surface)", borderColor:intakeMl===ml?"var(--accent)":"var(--border)" }}>{ml}</button>))}</div>
          <input type="number" value={customMl} onChange={(e) => { setCustomMl(e.target.value); setIntakeMl(null); }} placeholder="Anden mængde (ml)" className="w-full rounded-xl px-4 py-3 text-lg text-center" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} />
        </div>
        <NoteField value={note} onChange={setNote} />
        <div className="flex gap-3"><button onClick={resetAll} className="flex-1 py-4 rounded-2xl text-lg font-semibold" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--muted)" }}>Annuller</button><button onClick={saveIntake} disabled={!intakeMl && !customMl} className="flex-grow py-4 rounded-2xl text-lg font-bold disabled:opacity-40" style={{ background:"var(--accent)", color:"#fff" }}>Gem ✓</button></div>
      </div>
    </div>
  );

  return null;
}

function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div><label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Tidspunkt</label><input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl px-4 py-4 text-2xl font-bold text-center" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} /></div>;
}
function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div><label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Kommentar (valgfri)</label><textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="F.eks. drak meget kaffe..." rows={2} className="w-full rounded-xl px-4 py-3 text-base resize-none" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} /></div>;
}
function UrgencyPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <div><label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Urgency (trang)</label><div className="flex gap-2">{[0,1,2,3,4].map((n) => (<button key={n} onClick={() => onChange(n)} className="flex-1 py-3 rounded-xl border-2 text-lg font-bold" style={{ background:value===n?"var(--accent)":"var(--surface)", borderColor:value===n?"var(--accent)":"var(--border)" }}>{n}</button>))}</div><p className="text-xs text-[var(--muted)] mt-1">{URGENCY_LABELS[value]}</p></div>;
}
function IncSection({ has, setHas, severity, setSeverity, activity, setActivity }: { has: boolean; setHas: (v: boolean) => void; severity: IncontinenceSeverity; setSeverity: (v: IncontinenceSeverity) => void; activity: string; setActivity: (v: string) => void }) {
  return <div><label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Inkontinens?</label>
    <div className="flex gap-3 mb-3">{[false,true].map((v) => (<button key={String(v)} onClick={() => setHas(v)} className="flex-1 py-3 rounded-xl border-2 text-lg font-semibold" style={{ background:has===v?(v?"var(--danger)":"var(--success)"):"var(--surface)", borderColor:has===v?(v?"var(--danger)":"var(--success)"):"var(--border)", color:has===v?"#fff":"var(--text)" }}>{v?"Ja":"Nej"}</button>))}</div>
    {has && <><div className="grid grid-cols-2 gap-2 mb-3">{SEVERITY_OPTIONS.map((s) => (<button key={s.value} onClick={() => setSeverity(s.value)} className="py-2 rounded-xl border-2 text-sm font-semibold" style={{ background:severity===s.value?"var(--warning)":"var(--surface)", borderColor:severity===s.value?"var(--warning)":"var(--border)", color:severity===s.value?"#000":"var(--text)" }}>{s.label}</button>))}</div><input type="text" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Aktivitet (f.eks. hostede)" className="w-full rounded-xl px-4 py-3 text-base" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} /></>}
  </div>;
}
