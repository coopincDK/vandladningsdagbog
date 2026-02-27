"use client";
import { useState, useEffect, Suspense } from "react";
import { useSync, createSyncRoom, joinSyncRoom, leaveSyncRoom } from "@/lib/useSync";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams, useRouter } from "next/navigation";

function SyncContent() {
  const { roomId, syncing } = useSync();
  const [localRoom, setLocalRoom] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [manualId, setManualId] = useState("");
  const [copied, setCopied] = useState(false);
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
      router.replace("/sync");
    }
  }, [searchParams, localRoom, router]);

  const syncUrl = localRoom
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/sync?room=${localRoom}`
    : "";

  function handleCreate() {
    const id = createSyncRoom();
    setLocalRoom(id);
  }

  function handleLeave() {
    leaveSyncRoom();
    setLocalRoom(null);
    setJoined(false);
  }

  function handleManualJoin() {
    const id = manualId.trim().toUpperCase();
    if (id.length < 4) return;
    joinSyncRoom(id);
    setLocalRoom(id);
    setJoined(true);
    setManualId("");
  }

  function handleCopy() {
    if (!localRoom) return;
    navigator.clipboard.writeText(localRoom).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Direkte link til dette room (til bogmærke)
  const bookmarkUrl = syncUrl;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">☁️ Sync</h1>
      <p className="text-[var(--muted)] mb-6">Del data mellem enheder i realtid.</p>

      {/* Status */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm text-[var(--muted)] mb-1">Status</p>
        {localRoom ? (
          <p className="text-lg font-semibold" style={{ color: "var(--success)" }}>✅ Sync aktiv</p>
        ) : (
          <p className="text-lg font-semibold" style={{ color: "var(--muted)" }}>Ikke forbundet til et sync-room</p>
        )}
      </div>

      {/* Joined besked */}
      {joined && (
        <div className="rounded-2xl p-4 mb-6" style={{ background: "#052e16", border: "1px solid var(--success)" }}>
          <p className="text-sm" style={{ color: "var(--success)" }}>✅ Du er nu forbundet! Data synkroniseres automatisk.</p>
        </div>
      )}

      {!localRoom ? (
        <div className="space-y-4">
          {/* Opret nyt room */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="font-bold text-lg mb-2">Opret nyt sync-room</h2>
            <p className="text-sm text-[var(--muted)] mb-4">Opret et room og scan QR-koden på dine andre enheder.</p>
            <button onClick={handleCreate} className="w-full py-5 rounded-2xl text-xl font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
              ➕ Opret sync-room
            </button>
          </div>

          {/* Indtast kode manuelt */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="font-bold text-lg mb-2">Har du allerede en kode?</h2>
            <p className="text-sm text-[var(--muted)] mb-3">Skriv din 8-cifrede room-kode her:</p>
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value.toUpperCase())}
              placeholder="F.eks. ABCD1234"
              maxLength={8}
              className="w-full rounded-xl px-4 py-4 text-2xl font-bold text-center tracking-widest mb-3"
              style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--text)" }}
            />
            <button
              onClick={handleManualJoin}
              disabled={manualId.trim().length < 4}
              className="w-full py-4 rounded-2xl text-lg font-bold disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Forbind med kode
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Room kode — stor og tydelig */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--muted)" }}>DIN ROOM-KODE</p>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-4xl font-bold tracking-widest flex-1" style={{ color: "var(--accent)", fontFamily: "monospace" }}>
                {localRoom}
              </p>
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: copied ? "var(--success)" : "var(--bg)", border: "2px solid var(--border)", color: copied ? "#fff" : "var(--text)" }}
              >
                {copied ? "✓ Kopieret" : "Kopiér"}
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              💡 <strong>Gem denne kode!</strong> Hvis du mister forbindelsen, kan du genforbinde ved at skrive koden manuelt.
            </p>

            {/* Bogmærke-link */}
            <a
              href={bookmarkUrl}
              className="block w-full py-3 rounded-xl text-sm font-semibold text-center mb-4"
              style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--text)" }}
            >
              🔖 Tryk her og tilføj til bogmærker for at huske koden
            </a>

            {/* QR kode */}
            <p className="text-sm font-semibold mb-3">📱 Scan med mobilen for at synkronisere:</p>
            <div className="flex justify-center mb-3 rounded-xl overflow-hidden" style={{ background: "#fff", padding: 16 }}>
              <QRCodeSVG value={syncUrl} size={220} level="M" style={{ display: "block", width: "100%", height: "auto", maxWidth: 220 }} />
            </div>
            <p className="text-xs text-[var(--muted)] text-center">Alle enheder der scanner denne kode deler automatisk data.</p>
          </div>

          {/* Forlad */}
          <button onClick={handleLeave} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--surface)", border: "2px solid var(--danger)", color: "var(--danger)" }}>
            🔌 Forlad sync-room
          </button>
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
