"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { UserProfile, Sex } from "@/lib/types";

export default function ProfilPage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const clearData = useStore((s) => s.clearData);
  const entries = useStore((s) => s.entries);
  const [confirmClear, setConfirmClear] = useState(false);
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male");
  const [birthYear, setBirthYear] = useState(profile?.birthYear ?? 1960);
  const [sleepTime, setSleepTime] = useState(profile?.sleepTime ?? "22:00");
  const [wakeTime, setWakeTime] = useState(profile?.wakeTime ?? "07:00");
  const [patientLabel, setPatientLabel] = useState(profile?.patientLabel ?? "");

  // Synkroniser lokale state-værdier når profil opdateres via sync
  const prevProfileRef = useRef(profile);
  useEffect(() => {
    if (profile && profile !== prevProfileRef.current) {
      setSex(profile.sex);
      setBirthYear(profile.birthYear);
      setSleepTime(profile.sleepTime);
      setWakeTime(profile.wakeTime);
      setPatientLabel(profile.patientLabel ?? "");
      prevProfileRef.current = profile;
    }
  }, [profile]);
  const isNew = !profile;
  const age = profile ? new Date().getFullYear() - profile.birthYear : null;

  function save() {
    setProfile({ sex, birthYear, sleepTime, wakeTime, patientLabel: patientLabel.trim() || undefined });
    setTimeout(() => router.push("/registrer"), 100);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {isNew ? <h1 className="text-3xl font-bold mb-2">Velkommen 👋</h1> : <h1 className="text-3xl font-bold mb-6">{profile?.sex === "male" ? "🧔 Mand" : "👩 Kvinde"}, {age} år</h1>}
      {isNew && <p className="text-[var(--muted)] mb-6">Udfyld et par oplysninger for korrekte estimater. Ingen navn eller CPR.</p>}
      <div className="space-y-6 mt-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Køn</label>
          <div className="grid grid-cols-2 gap-3">
            {(["male","female"] as Sex[]).map((s) => (
              <button key={s} onClick={() => setSex(s)} className="py-4 rounded-xl text-lg font-semibold border-2" style={{ background: sex===s?"var(--accent)":"var(--surface)", borderColor: sex===s?"var(--accent)":"var(--border)", color: sex===s?"#fff":"var(--text)" }}>
                {s==="male"?"🧔 Mand":"👩 Kvinde"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Dit ID / initialer (valgfri)</label>
          <input type="text" value={patientLabel} onChange={(e) => setPatientLabel(e.target.value)}
            placeholder="F.eks. MM eller Patient 1"
            className="w-full rounded-xl px-4 py-4 text-xl font-bold text-center"
            style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} />
          <p className="text-xs mt-1" style={{ color:"var(--muted)" }}>Vises øverst i PDF-eksporten. Ingen navn eller CPR gemmes.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Fødselsår</label>
          <input type="number" min={1920} max={2015} value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} className="w-full rounded-xl px-4 py-4 text-2xl font-bold text-center" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Sengetid</label>
            <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="w-full rounded-xl px-4 py-4 text-xl font-bold text-center" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Opstår</label>
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="w-full rounded-xl px-4 py-4 text-xl font-bold text-center" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--text)" }} />
          </div>
        </div>
        <button onClick={save} className="w-full py-5 rounded-2xl text-xl font-bold active:scale-95 transition-transform" style={{ background:"var(--accent)", color:"#fff" }}>
          {isNew ? "Kom i gang →" : "Gem ændringer"}
        </button>
      </div>
      <p className="text-xs text-[var(--muted)] text-center mt-8">Data gemmes lokalt i din browser.</p>

      {/* Slet alle målinger */}
      {!isNew && (
        <div className="mt-10 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--muted)" }}>Nulstil målinger</p>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Sletter alle registreringer og dage — så du kan starte en ny runde. Din profil beholdes.
            {entries.length > 0 && <span className="font-semibold" style={{ color: "var(--text)" }}> ({entries.length} registreringer)</span>}
          </p>
          {!confirmClear ? (
            <button onClick={() => setConfirmClear(true)}
              className="w-full py-4 rounded-2xl text-base font-semibold"
              style={{ background: "var(--surface)", border: "2px solid var(--danger)", color: "var(--danger)" }}>
              🗑 Slet alle målinger
            </button>
          ) : (
            <div className="rounded-2xl p-4" style={{ background: "#450a0a", border: "2px solid var(--danger)" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "#fca5a5" }}>
                Er du sikker? Dette kan ikke fortrydes.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmClear(false)}
                  className="flex-1 py-3 rounded-xl text-base font-semibold"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                  Annuller
                </button>
                <button onClick={() => { clearData(); setConfirmClear(false); router.push("/registrer"); }}
                  className="flex-1 py-3 rounded-xl text-base font-bold"
                  style={{ background: "var(--danger)", color: "#fff" }}>
                  Ja, slet alt
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
