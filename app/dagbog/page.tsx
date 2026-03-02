"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { format, parse, addDays } from "date-fns";
import { da } from "date-fns/locale";
import type { Entry } from "@/lib/types";

const SEV: Record<string,string> = { dry:"Tørt", damp:"Lidt fugtigt", wet:"Vådt", soaked:"Gennemblødt" };
const ICONS: Record<string,string> = { vand:"🥛", kaffe:"☕", te:"🍵", juice:"🍊", alkohol:"🍺", sodavand:"🥤", andet:"🫙" };

function icon(e: Entry) { return e.type==="void"?"💧":e.type==="intake"?(ICONS[e.beverageType??"andet"]??"🥛"):"⚠️"; }
function label(e: Entry) {
  if (e.type==="void") return `${e.voidMl} ml${e.isEstimated?" (est.)":""}  ·  Urgency ${e.urgencyScore??0}`;
  if (e.type==="intake") return `${e.beverageType}  ·  ${e.intakeMl} ml`;
  return `Inkontinens: ${SEV[e.severity??"damp"]}${e.activity?` · ${e.activity}`:""}`;
}

// Givet et timestamp og profil: hvilken "dag-periode" (1/2/3) hører det til?
// Dag 1 starter ved opståtid på dag 1, dag 2 ved opståtid dag 2 osv.
// Vi bruger den tidligste entry's dato som dag 1 reference.
function assignDayNumber(
  entryTs: string,
  allEntries: Entry[],
  wakeTime: string // "HH:mm"
): 1 | 2 | 3 {
  if (allEntries.length === 0) return 1;

  // Find den tidligste entry's dato som reference for dag 1
  const sorted = [...allEntries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const firstDate = new Date(sorted[0].timestamp);

  // Opståtid som Date på dag 1
  const [wh, wm] = wakeTime.split(":").map(Number);
  const wake1 = new Date(firstDate);
  wake1.setHours(wh, wm, 0, 0);

  // Hvis første entry er FØR opståtid, start dag 1 fra midnat den dag
  // Ellers start dag 1 fra opståtid
  const day1Start = wake1;
  const day2Start = addDays(wake1, 1);
  const day3Start = addDays(wake1, 2);
  const day3End = addDays(wake1, 3);

  const ts = new Date(entryTs);

  if (ts < day1Start) return 1; // Før opståtid dag 1 — hører til dag 1
  if (ts < day2Start) return 1;
  if (ts < day3Start) return 2;
  if (ts < day3End) return 3;
  return 3; // Alt efter dag 3 hører til dag 3
}

export default function DagbogPage() {
  const { days, entries, profile, updateEntry, deleteEntry, ensureDay } = useStore();
  const [dayNum, setDayNum] = useState<1|2|3>(1);
  const [editId, setEditId] = useState<string|null>(null);
  const [autoSorted, setAutoSorted] = useState(false);

  const day = days.find((d) => d.dayNumber === dayNum);
  const dayEntries = day
    ? entries.filter((e) => e.dayId === day.id).sort((a,b) => a.timestamp.localeCompare(b.timestamp))
    : [];

  // Tæl entries per dag til badge
  const countForDay = (n: 1|2|3) => {
    const d = days.find((d) => d.dayNumber === n);
    return d ? entries.filter((e) => e.dayId === d.id).length : 0;
  };

  function handleAutoSort() {
    if (!profile) return;
    // Fordel alle entries på dag 1/2/3 baseret på timestamp
    for (const entry of entries) {
      const targetNum = assignDayNumber(entry.timestamp, entries, profile.wakeTime);
      const currentDay = days.find((d) => d.id === entry.dayId);
      if (currentDay?.dayNumber !== targetNum) {
        const targetDay = ensureDay(targetNum);
        updateEntry(entry.id, { dayId: targetDay.id });
      }
    }
    setAutoSorted(true);
    setTimeout(() => setAutoSorted(false), 3000);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Dagbog</h1>
        {profile && entries.length > 0 && (
          <button
            onClick={handleAutoSort}
            className="text-xs px-3 py-2 rounded-xl font-semibold"
            style={{ background: autoSorted ? "var(--success)" : "var(--surface)", border: "1px solid var(--border)", color: autoSorted ? "#fff" : "var(--muted)" }}
          >
            {autoSorted ? "✅ Sorteret!" : "🔀 Auto-sortér dage"}
          </button>
        )}
      </div>

      {/* Dag-tabs med antal */}
      <div className="flex gap-2 mb-4">
        {([1,2,3] as const).map((n) => (
          <button key={n} onClick={() => setDayNum(n)}
            className="flex-1 py-3 rounded-xl border-2 text-base font-semibold relative"
            style={{ background: dayNum===n?"var(--accent)":"var(--surface)", borderColor: dayNum===n?"var(--accent)":"var(--border)", color: dayNum===n?"#fff":"var(--text)" }}>
            Dag {n}
            {countForDay(n) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold"
                style={{ background: dayNum===n?"#fff":"var(--accent)", color: dayNum===n?"var(--accent)":"#fff" }}>
                {countForDay(n)}
              </span>
            )}
          </button>
        ))}
      </div>

      {day && <p className="text-[var(--muted)] text-sm mb-4">{format(new Date(day.date),"EEEE d. MMMM yyyy",{locale:da})}</p>}

      {autoSorted && (
        <div className="rounded-xl p-3 mb-4 text-sm" style={{ background:"#052e16", border:"1px solid var(--success)", color:"var(--success)" }}>
          ✅ Entries fordelt automatisk på dag 1/2/3 ud fra opståtid ({profile?.wakeTime})
        </div>
      )}

      {dayEntries.length===0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background:"var(--surface)", border:"2px dashed var(--border)" }}>
          <p className="text-5xl mb-3">📋</p>
          <p className="text-[var(--muted)]">Ingen registreringer på dag {dayNum}</p>
          {entries.length > 0 && (
            <button onClick={handleAutoSort} className="mt-4 text-sm underline" style={{ color:"var(--accent)" }}>
              Prøv auto-sortér →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">{dayEntries.map((e) => (
          <div key={e.id} className="rounded-xl p-3" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <p className="font-semibold">{icon(e)} {label(e)}</p>
                {e.isEstimated && <p className="text-xs" style={{ color:"var(--warning)" }}>Estimeret</p>}
                {e.note && <p className="text-xs italic text-[var(--muted)]">💬 {e.note}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-[var(--muted)]">{format(new Date(e.timestamp),"HH:mm")}</span>
                <button onClick={() => setEditId(editId===e.id?null:e.id)} className="text-sm px-2 py-1 rounded-lg" style={{ background:"var(--bg)", border:"1px solid var(--border)", color:"var(--muted)" }}>✏️</button>
              </div>
            </div>
            {editId===e.id && <EditRow entry={e}
              onSave={(patch) => { updateEntry(e.id, patch); setEditId(null); }}
              onDelete={() => { deleteEntry(e.id); setEditId(null); }}
              onMove={(n) => {
                const targetDay = ensureDay(n);
                updateEntry(e.id, { dayId: targetDay.id });
                setEditId(null);
              }}
            />}
          </div>
        ))}</div>
      )}
    </div>
  );
}

function EditRow({ entry, onSave, onDelete, onMove }: { entry: Entry; onSave: (p: Partial<Entry>) => void; onDelete: () => void; onMove: (n: 1|2|3) => void }) {
  const [ml, setMl] = useState(String(entry.voidMl ?? entry.intakeMl ?? ""));
  const [time, setTime] = useState(format(new Date(entry.timestamp), "HH:mm"));
  const [note, setNote] = useState(entry.note ?? "");
  const [confirm, setConfirm] = useState(false);

  function save() {
    const [h,m] = time.split(":").map(Number); const ts = new Date(entry.timestamp); ts.setHours(h,m,0,0);
    const patch: Partial<Entry> = { timestamp: ts.toISOString(), note: note.trim() || undefined };
    if (entry.type === "void") patch.voidMl = Number(ml);
    if (entry.type === "intake") patch.intakeMl = Number(ml);
    onSave(patch);
  }

  return (
    <div className="mt-3 pt-3 space-y-3" style={{ borderTop:"1px solid var(--border)" }}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-[var(--muted)]">Tid</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg px-3 py-2 text-center" style={{ background:"var(--bg)", border:"1px solid var(--border)", color:"var(--text)" }} /></div>
        {(entry.type==="void"||entry.type==="intake") && <div><label className="text-xs text-[var(--muted)]">ml</label><input type="number" value={ml} onChange={(e) => setMl(e.target.value)} className="w-full rounded-lg px-3 py-2 text-center" style={{ background:"var(--bg)", border:"1px solid var(--border)", color:"var(--text)" }} /></div>}
      </div>
      <div><label className="text-xs text-[var(--muted)]">Kommentar</label><input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg px-3 py-2" style={{ background:"var(--bg)", border:"1px solid var(--border)", color:"var(--text)" }} /></div>
      <div className="flex gap-2">
        <button onClick={save} className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background:"var(--accent)", color:"#fff" }}>Gem</button>
        {!confirm ? <button onClick={() => setConfirm(true)} className="py-2 px-3 rounded-lg text-sm" style={{ border:"1px solid var(--danger)", color:"var(--danger)" }}>🗑</button> : <button onClick={onDelete} className="py-2 px-3 rounded-lg text-sm font-bold" style={{ background:"var(--danger)", color:"#fff" }}>Slet?</button>}
      </div>
      <div>
        <p className="text-xs text-[var(--muted)] mb-1">Flyt til dag</p>
        <div className="flex gap-2">
          {([1,2,3] as const).map((n) => (
            <button key={n} onClick={() => onMove(n)}
              className="flex-1 py-1 rounded-lg text-sm font-semibold"
              style={{ background:"var(--bg)", border:"1px solid var(--border)", color:"var(--muted)" }}>
              Dag {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
