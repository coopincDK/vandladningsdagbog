"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/lib/store";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "next/navigation";

export default function SyncPage() {
  const { uid, loading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [restoreId, setRestoreId] = useState("");
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const searchParams = useSearchParams();

  // Auto-restore fra QR-link
  useEffect(() => {
    const id = searchParams.get("id");
    if (id && id !== uid) {
      setRestoreId(id);
    }
  }, [searchParams, uid]);

  const shortId = uid ? uid.slice(0, 8).toUpperCase() : "...";
  const syncUrl = uid ? `${window.location.origin}/sync?id=${uid}` : "";

  async function copyFullId() {
    if (!uid) return;
    await navigator.clipboard.writeText(uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function restore(id?: string) {
    const syncId = (id || restoreId).trim();
    if (!syncId) return;
    setRestoreStatus("loading");
    try {
      const snap = await getDoc(doc(db, "users", syncId));
      if (!snap.exists()) { setRestoreStatus("error"); return; }
      const data = snap.data();
      const state = useStore.getState();
      if (data.profile) state.setProfile(data.profile);
      if (data.days) useStore.setState({ days: data.days });
      if (data.entries) useStore.setState({ entries: data.entries });
      setRestoreStatus("success");
    } catch { setRestoreStatus("error"); }
  }

  // Auto-restore når der er et ID i URL'en
  useEffect(() => {
    const id = searchParams.get("id");
    if (id && id !== uid && uid && restoreStatus === "idle") {
      restore(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, uid]);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">☁️ Sync</h1>
      <p className="text-[var(--muted)] mb-8">Synkroniser data mellem enheder.</p>

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

      {/* QR-kode */}
      {uid && syncUrl && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm text-[var(--muted)] mb-1">Dit Sync-ID</p>
          <p className="text-3xl font-mono font-bold tracking-wider mb-4">{shortId}</p>
          
          <p className="text-sm font-semibold mb-3">📱 Scan med mobilen for at synkronisere:</p>
          <div className="flex justify-center mb-4 p-4 rounded-xl" style={{ background: "#fff" }}>
            <QRCodeSVG value={syncUrl} size={200} level="M" />
          </div>
          
          <button onClick={copyFullId} className="w-full py-3 rounded-xl text-sm font-semibold mb-2" style={{ background: copied ? "var(--success)" : "var(--accent)", color: "#fff" }}>
            {copied ? "✅ Kopieret!" : "📋 Kopiér fuldt ID"}
          </button>
        </div>
      )}

      {/* Manuel gendannelse */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="font-bold text-lg mb-1">Manuel gendannelse</h2>
        <p className="text-sm text-[var(--muted)] mb-3">Indsæt et fuldt Sync-ID for at hente data.</p>
        <p className="text-xs mb-3" style={{ color: "var(--warning)" }}>⚠ Dette overskriver alle data på denne enhed!</p>
        <input type="text" value={restoreId} onChange={(e) => { setRestoreId(e.target.value); setRestoreStatus("idle"); }} placeholder="Indsæt fuldt Sync-ID" className="w-full rounded-xl px-4 py-4 text-lg font-mono text-center mb-3" style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--text)" }} />
        <button onClick={() => restore()} disabled={!restoreId.trim() || restoreStatus === "loading"} className="w-full py-4 rounded-xl text-lg font-bold disabled:opacity-40" style={{ background: "var(--warning)", color: "#000" }}>
          {restoreStatus === "loading" ? "⏳ Henter..." : "🔄 Hent data"}
        </button>
        {restoreStatus === "success" && <p className="text-sm mt-3 text-center" style={{ color: "var(--success)" }}>✅ Data hentet! Begge enheder synkroniserer nu automatisk.</p>}
        {restoreStatus === "error" && <p className="text-sm mt-3 text-center" style={{ color: "var(--danger)" }}>✗ Kunne ikke finde data. Tjek ID&apos;et.</p>}
      </div>

      <p className="text-xs text-[var(--muted)] text-center mt-8">Data gemmes krypteret. Ingen navn, CPR eller e-mail registreres.</p>
    </div>
  );
}
