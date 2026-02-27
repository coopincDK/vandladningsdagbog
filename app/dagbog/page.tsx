"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
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

export default function DagbogPage() {
  const { days, entries, updateEntry, deleteEntry } = useStore();
  const [dayNum, setDayNum] = useState<1|2|3>(1);
  const [editId, setEditId] = useState<string|null>(null);
  const day = days.find((d) => d.dayNumber === dayNum);
  const dayEntries = day ? entries.filter((e) => e.dayId === day.id).sort((a,b) => a.timestamp.localeCompare(b.timestamp)) : [];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dagbog</h1>
      <div className="flex gap-2 mb-6">{([1,2,3] as const).map((n) => (<button key={n} onClick={() => setDayNum(n)} className="flex-1 py-3 rounded-xl border-2 text-lg font-semibold" style={{ background:dayNum===n?"var(--accent)":"var(--surface)", borderColor:dayNum===n?"var(--accent)":"var(--border)", color:dayNum===n?"#fff":"var(--text)" }}>Dag {n}</button>))}</div>
      {day && <p className="text-[var(--muted)] text-sm mb-4">{format(new Date(day.date),"EEEE d. MMMM yyyy",{locale:da})}</p>}
      {dayEntries.length===0 ? <div className="rounded-2xl p-8 text-center" style={{ background:"var(--surface)", border:"2px dashed var(--border)" }}><p className="text-5xl mb-3">📋</p><p className="text-[var(--muted)]">Ingen registreringer endnu</p></div> : (
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
            {editId===e.id && <EditRow entry={e} onSave={(patch) => { updateEntry(e.id, patch); setEditId(null); }} onDelete={() => { deleteEntry(e.id); setEditId(null); }} />}
          </div>
        ))}</div>
      )}
    </div>
  );
}

function EditRow({ entry, onSave, onDelete }: { entry: Entry; onSave: (p: Partial<Entry>) => void; onDelete: () => void }) {
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
    </div>
  );
}
