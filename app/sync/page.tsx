"use client";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/lib/useAuth";
import { useSync, createSyncRoom, joinSyncRoom, leaveSyncRoom } from "@/lib/useSync";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams, useRouter } from "next/navigation";

function SyncContent() {
  const { loading } = useAuth();
  const { roomId, syncing } = useSync();
  const [localRoom, setLocalRoom] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Læs room fra localStorage ved mount
  useEffect(() => {
    const r = typeof window !== "undefined" ? localStorage.getItem("sync-room") : null;
    setLocalRoom(r);
  }, [roomId]);

  // Auto-join fra QR-link
  useEffect(() => {
    const id = searchParams.get("room");
    if (id && id !== localRoom) {
      joinSyncRoom(id);
      setLocalRoom(id);
      setJoined(true);
      // Fjern query param fra URL
      router.replace("/sync");
    }
  }, [searchParams, localRoom, router]);

  const syncUrl = localRoom ? `${typeof window !== "undefined" ? window.location.origin : ""}/sync?room=${localRoom}` : "";

  function handleCreate() {
    const id = createSyncRoom();
    setLocalRoom(id);
  }

  function handleLeave() {
    leaveSyncRoom();
    setLocalRoom(null);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">☁️ Sync</h1>
      <p className="text-[var(--muted)] mb-8">Del data mellem enheder i realtid.</p>

      {/* Status */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm text-[var(--muted)] mb-1">Status</p>
        {loading ? (
          <p className="text-lg font-semibold">⏳ Forbinder...</p>
        ) : localRoom ? (
          <p className="text-lg font-semibold" style={{ color: "var(--success)" }}>✅ Sync aktiv — Room: {localRoom}</p>
        ) : (
          <p className="text-lg font-semibold" style={{ color: "var(--muted)" }}>Ikke forbundet til et sync-room</p>
        )}
      </div>

      {/* Joined besked */}
      {joined && (
        <div className="rounded-2xl p-4 mb-6" style={{ background: "#052e16", border: "1px solid var(--success)" }}>
          <p className="text-sm" style={{ color: "var(--success)" }}>✅ Du er nu forbundet! Data synkroniseres automatisk mellem alle enheder i dette room.</p>
        </div>
      )}

      {!localRoom ? (
        /* Ingen room — opret eller join */
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="font-bold text-lg mb-2">Opret nyt sync-room</h2>
            <p className="text-sm text-[var(--muted)] mb-4">Opret et room og scan QR-koden på dine andre enheder.</p>
            <button onClick={handleCreate} className="w-full py-5 rounded-2xl text-xl font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
              ➕ Opret sync-room
            </button>
          </div>
        </div>
      ) : (
        /* Room aktivt — vis QR */
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-semibold mb-3">📱 Scan med mobilen for at synkronisere:</p>
            <div className="flex justify-center mb-4 rounded-xl overflow-hidden" style={{ background: "#fff", padding: 16 }}>
              <QRCodeSVG value={syncUrl} size={220} level="M" style={{ display: "block", width: "100%", height: "auto", maxWidth: 220 }} />
            </div>
            <p className="text-xs text-[var(--muted)] text-center mb-4">Alle enheder der scanner denne kode deler automatisk data.</p>
            
            <button onClick={handleLeave} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--surface)", border: "2px solid var(--danger)", color: "var(--danger)" }}>
              🔌 Forlad sync-room
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--muted)] text-center mt-8">Data gemmes krypteret. Ingen navn, CPR eller e-mail registreres.</p>
    </div>
  );
}

export default function SyncPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh"><p style={{ color: "var(--muted)" }}>Indlæser…</p></div>}>
      <SyncContent />
    </Suspense>
  );
}
