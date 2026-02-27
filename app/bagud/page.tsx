"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { estimateVolume } from "@/lib/qavg";
import type { BeverageType, Entry } from "@/lib/types";
import { format, parse, addMinutes, subMinutes } from "date-fns";

const BEVERAGES: { type: BeverageType; icon: string; label: string }[] = [
  { type: "vand", icon: "💧", label: "Vand" },
  { type: "kaffe", icon: "☕", label: "Kaffe" },
  { type: "te", icon: "🍵", label: "Te" },
  { type: "juice", icon: "🍊", label: "Juice" },
  { type: "alkohol", icon: "🍺", label: "Alkohol" },
  { type: "sodavand", icon: "🥤", label: "Sodavand" },
  { type: "andet", icon: "🫙", label: "Andet" },
];

const QUICK_ML = [150, 200, 250, 330, 500];

type RowType = "void" | "intake";

interface Row {
  id: string;
  type: RowType;
  time: string; // HH:mm
  // void
  durationSec: string;
  voidMl: string;
  urgency: number;
  // intake
  beverageType: BeverageType;
  intakeMl: number | null;
  customMl: string;
}

function newRow(time: string, type: RowType = "void"): Row {
  return {
    id: crypto.randomUUID(),
    type,
    time,
    durationSec: "",
    voidMl: "",
    urgency: 0,
    beverageType: "vand",
    intakeMl: null,
    customMl: "",
  };
}

function addMinutesToHHMM(hhmm: string, mins: number): string {
  try {
    const base = parse(hhmm, "HH:mm", new Date());
    return format(addMinutes(base, mins), "HH:mm");
  } catch {
    return hhmm;
  }
}

function subMinutesFromHHMM(hhmm: string, mins: number): string {
  try {
    const base = parse(hhmm, "HH:mm", new Date());
    return format(subMinutes(base, mins), "HH:mm");
  } catch {
    return hhmm;
  }
}

export default function BagudPage() {
  const router = useRouter();
  const { profile, ensureDay, addEntry } = useStore();
  const now = format(new Date(), "HH:mm");
  const [startTime, setStartTime] = useState(subMinutesFromHHMM(now, 60));
  const [interval, setInterval] = useState(15);
  const [rows, setRows] = useState<Row[]>([newRow(subMinutesFromHHMM(now, 60))]);
  const [saved, setSaved] = useState(false);

  // Generer tidspunkter automatisk baseret på startTime + interval
  function regenerateTimes(start: string, mins: number, currentRows: Row[]): Row[] {
    return currentRows.map((r, i) => ({
      ...r,
      time: addMinutesToHHMM(start, i * mins),
    }));
  }

  function handleStartChange(val: string) {
    setStartTime(val);
    setRows((prev) => regenerateTimes(val, interval, prev));
  }

  function handleIntervalChange(val: number) {
    setInterval(val);
    setRows((prev) => regenerateTimes(startTime, val, prev));
  }

  function addRow() {
    const lastTime = rows.length > 0 ? rows[rows.length - 1].time : startTime;
    const nextTime = addMinutesToHHMM(lastTime, interval);
    setRows((prev) => [...prev, newRow(nextTime)]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // Beregn estimat når sekunder ændres
  function handleDurationChange(id: string, sec: string) {
    updateRow(id, { durationSec: sec });
    if (profile && sec) {
      const est = estimateVolume(profile.sex, profile.birthYear, Number(sec));
      updateRow(id, { durationSec: sec, voidMl: String(est) });
    }
  }

  function timeToISO(hhmm: string): string {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  function saveAll() {
    const day = ensureDay(1);
    let count = 0;
    for (const row of rows) {
      if (row.type === "void") {
        const ml = Number(row.voidMl);
        if (!ml) continue;
        const hasDuration = !!row.durationSec;
        const entry: Entry = {
          id: crypto.randomUUID(),
          dayId: day.id,
          timestamp: timeToISO(row.time),
          type: "void",
          voidMl: ml,
          isEstimated: hasDuration,
          durationSeconds: hasDuration ? Number(row.durationSec) : undefined,
          urgencyScore: row.urgency,
        };
        addEntry(entry);
        count++;
      } else {
        const ml = row.intakeMl ?? Number(row.customMl);
        if (!ml) continue;
        const entry: Entry = {
          id: crypto.randomUUID(),
          dayId: day.id,
          timestamp: timeToISO(row.time),
          type: "intake",
          beverageType: row.beverageType,
          intakeMl: ml,
        };
        addEntry(entry);
        count++;
      }
    }
    setSaved(true);
    setTimeout(() => router.push("/dagbog"), 1200);
  }

  const validRows = rows.filter((r) =>
    r.type === "void" ? !!r.voidMl : !!(r.intakeMl ?? Number(r.customMl))
  );

  if (!profile) return (
    <div className="max-w-lg mx-auto px-4 py-8 text-center">
      <p style={{ color: "var(--muted)" }}>Udfyld din profil først</p>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="text-[var(--muted)] mb-4">← Tilbage</button>
      <h1 className="text-3xl font-bold mb-1">📋 Bagudregistrering</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Glemt mobilen? Tilføj flere hændelser på én gang.
      </p>

      {/* Indstillinger */}
      <div className="rounded-2xl p-4 mb-6 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--muted)" }}>Starttidspunkt</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => handleStartChange(e.target.value)}
              className="w-full rounded-xl px-3 py-3 text-xl font-bold text-center"
              style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--muted)" }}>Interval (min)</label>
            <div className="flex gap-2">
              {[15, 30, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => handleIntervalChange(m)}
                  className="flex-1 py-3 rounded-xl border-2 text-sm font-bold"
                  style={{
                    background: interval === m ? "var(--accent)" : "var(--bg)",
                    borderColor: interval === m ? "var(--accent)" : "var(--border)",
                    color: interval === m ? "#fff" : "var(--text)",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rækker */}
      <div className="space-y-3 mb-4">
        {rows.map((row, i) => (
          <div key={row.id} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "var(--bg)", color: "var(--muted)" }}>#{i + 1}</span>
                <input
                  type="time"
                  value={row.time}
                  onChange={(e) => updateRow(row.id, { time: e.target.value })}
                  className="rounded-lg px-2 py-1 text-base font-bold"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div className="flex items-center gap-2">
                {/* Type toggle */}
                <button
                  onClick={() => updateRow(row.id, { type: row.type === "void" ? "intake" : "void" })}
                  className="text-xs px-3 py-1 rounded-lg font-semibold"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}
                >
                  {row.type === "void" ? "💧 Tis" : "🥤 Drik"}
                </button>
                {rows.length > 1 && (
                  <button onClick={() => removeRow(row.id)} className="text-lg" style={{ color: "var(--danger)" }}>✕</button>
                )}
              </div>
            </div>

            {row.type === "void" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Sekunder (valgfri)</label>
                  <input
                    type="number"
                    value={row.durationSec}
                    onChange={(e) => handleDurationChange(row.id, e.target.value)}
                    placeholder="f.eks. 25"
                    className="w-full rounded-xl px-3 py-3 text-lg font-bold text-center"
                    style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>
                    ml {row.durationSec ? <span style={{ color: "var(--accent)" }}>(estimeret)</span> : ""}
                  </label>
                  <input
                    type="number"
                    value={row.voidMl}
                    onChange={(e) => updateRow(row.id, { voidMl: e.target.value })}
                    placeholder="f.eks. 250"
                    className="w-full rounded-xl px-3 py-3 text-lg font-bold text-center"
                    style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--text)" }}
                  />
                </div>
                {/* Urgency */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "var(--muted)" }}>Urgency</label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => updateRow(row.id, { urgency: n })}
                        className="flex-1 py-2 rounded-xl border-2 text-base font-bold"
                        style={{
                          background: row.urgency === n ? "var(--accent)" : "var(--bg)",
                          borderColor: row.urgency === n ? "var(--accent)" : "var(--border)",
                          color: row.urgency === n ? "#fff" : "var(--text)",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Drikketype */}
                <div className="grid grid-cols-4 gap-2">
                  {BEVERAGES.map((b) => (
                    <button
                      key={b.type}
                      onClick={() => updateRow(row.id, { beverageType: b.type })}
                      className="flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs"
                      style={{
                        background: row.beverageType === b.type ? "var(--accent)" : "var(--bg)",
                        borderColor: row.beverageType === b.type ? "var(--accent)" : "var(--border)",
                        color: row.beverageType === b.type ? "#fff" : "var(--text)",
                      }}
                    >
                      <span className="text-xl">{b.icon}</span>
                      {b.label}
                    </button>
                  ))}
                </div>
                {/* Mængde */}
                <div className="flex gap-2 flex-wrap">
                  {QUICK_ML.map((ml) => (
                    <button
                      key={ml}
                      onClick={() => updateRow(row.id, { intakeMl: ml, customMl: "" })}
                      className="py-2 px-3 rounded-xl border-2 text-sm font-bold"
                      style={{
                        background: row.intakeMl === ml ? "var(--accent)" : "var(--bg)",
                        borderColor: row.intakeMl === ml ? "var(--accent)" : "var(--border)",
                        color: row.intakeMl === ml ? "#fff" : "var(--text)",
                      }}
                    >
                      {ml} ml
                    </button>
                  ))}
                  <input
                    type="number"
                    value={row.customMl}
                    onChange={(e) => updateRow(row.id, { customMl: e.target.value, intakeMl: null })}
                    placeholder="Andet ml"
                    className="flex-1 min-w-[80px] rounded-xl px-3 py-2 text-sm text-center"
                    style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--text)" }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tilføj række */}
      <button
        onClick={addRow}
        className="w-full py-3 rounded-2xl text-base font-semibold mb-6"
        style={{ background: "var(--surface)", border: "2px dashed var(--border)", color: "var(--muted)" }}
      >
        + Tilføj hændelse
      </button>

      {/* Gem */}
      {saved ? (
        <div className="w-full py-5 rounded-2xl text-xl font-bold text-center" style={{ background: "#052e16", color: "var(--success)", border: "1px solid var(--success)" }}>
          ✅ {validRows.length} hændelser gemt!
        </div>
      ) : (
        <button
          onClick={saveAll}
          disabled={validRows.length === 0}
          className="w-full py-5 rounded-2xl text-xl font-bold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Gem {validRows.length > 0 ? `${validRows.length} hændelser` : ""}
        </button>
      )}

      <p className="text-xs text-center mt-4" style={{ color: "var(--muted)" }}>
        Sekunder → ml beregnes automatisk ud fra din alder og køn
      </p>
    </div>
  );
}
