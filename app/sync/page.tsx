"use client";
import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/lib/store";

export default function SyncPage() {
  const { uid, loading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [restoreId, setRestoreId] = useState("");
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const shortId = uid ? uid.slice(0, 8).toUpperCase() : "...";

  async function copyFullId() {
    if (!uid) return;
    await navigator.clipboard.writeText(uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function restore() {
    const id = restoreId.trim();
    if (!id) return;
    setRestoreStatus("loading");
    try {
      const snap = await getDoc(doc(db, "users", id));
      if (!snap.exists()) { setRestoreStatus("error"); return; }
      const data = snap.data();
      const state = useStore.getState();
      if (data.profile) state.setProfile(data.profile);
      if (data.days) useStore.setState({ days: data.days });
      if (data.entries) useStore.setState({ entries: data.entries });
      setRestoreStatus("success");
    } catch { setRestoreStatus("error"); }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">☁️ Sync</h1>
      <p className="text-[var(--muted)] mb-8">Data synkroniseres automatisk til Firebase.</p>

      {/* Status */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm text-[var(--muted)] mb-1">Status</p>
        {loading ? (
          <p className="text-lg font-semibold">⏳ Forbinder...</p>
        ) : uid ? (
          <p className="text-lg font-semibold" style={{ color: "var(--success)" }}>✅ Sync aktiv</p>
        ) : (
          <p className="text-lg font-semibold" style={{ color: "var(--danger)" }}>❌ Ikke forbundet</p>
        )}
      </div>

      {/* Sync ID */}
      {uid && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm text-[var(--muted)] mb-1">Dit Sync-ID</p>
          <p className="text-3xl font-mono font-bold tracking-wider mb-3">{shortId}</p>
          <button onClick={copyFullId} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: copied ? "var(--success)" : "var(--accent)", color: "#fff" }}>
            {copied ? "✅ Kopieret!" : "📋 Kopiér fuldt ID (til gendannelse)"}
          </button>
        </div>
      )}

      {/* Gendannelse */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="font-bold text-lg mb-1">Hent data fra en anden enhed</h2>
        <p className="text-sm text-[var(--muted)] mb-3">Har du allerede et Sync-ID fra en anden enhed? Indsæt det herunder for at hente dine data.</p>
        <p className="text-xs mb-3" style={{ color: "var(--warning)" }}>⚠ Dette overskriver alle data på denne enhed!</p>
        <input type="text" value={restoreId} onChange={(e) => { setRestoreId(e.target.value); setRestoreStatus("idle"); }} placeholder="Indsæt fuldt Sync-ID" className="w-full rounded-xl px-4 py-4 text-lg font-mono text-center mb-3" style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--text)" }} />
        <button onClick={restore} disabled={!restoreId.trim() || restoreStatus === "loading"} className="w-full py-4 rounded-xl text-lg font-bold disabled:opacity-40" style={{ background: "var(--warning)", color: "#000" }}>
          {restoreStatus === "loading" ? "⏳ Henter..." : "🔄 Hent data"}
        </button>
        {restoreStatus === "success" && <p className="text-sm mt-3 text-center" style={{ color: "var(--success)" }}>✅ Data hentet!</p>}
        {restoreStatus === "error" && <p className="text-sm mt-3 text-center" style={{ color: "var(--danger)" }}>✗ Kunne ikke finde data med det ID. Tjek at ID&apos;et er korrekt.</p>}
      </div>

      <p className="text-xs text-[var(--muted)] text-center mt-8">Data gemmes krypteret. Ingen navn, CPR eller e-mail registreres.</p>
    </div>
  );
}
