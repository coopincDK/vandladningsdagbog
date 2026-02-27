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
  const [customId, setCustomId] = useState("");
  const [customError, setCustomError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState("");
  const [editError, setEditError] = useState("");
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

  function handleCreateCustom() {
    const id = customId.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (id.length < 4) { setCustomError("Mindst 4 tegn (bogstaver og tal)"); return; }
    if (id.length > 20) { setCustomError("Maks 20 tegn"); return; }
    setCustomError("");
    joinSyncRoom(id);
    setLocalRoom(id);
  }

  function handleEditSave() {
    const id = editId.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (id.length < 4) { setEditError("Mindst 4 tegn"); return; }
    if (id.length > 20) { setEditError("Maks 20 tegn"); return; }
    setEditError("");
    joinSyncRoom(id);
    setLocalRoom(id);
    setEditing(false);
    setEditId("");
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
            <p className="text-sm text-[var(--muted)] mb-3">Vælg dit eget ID du kan huske, eller få et tilfældigt.</p>
            <input
              type="text"
              value={customId}
              onChange={(e) => { setCustomId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"")); setCustomError(""); }}
              placeholder="F.eks. MARTIN eller HUND42"
              maxLength={20}
              className="w-full rounded-xl px-4 py-4 text-2xl font-bold text-center tracking-widest mb-2"
              style={{ background: "var(--bg)", border: `2px solid ${customError ? "var(--danger)" : "var(--border)"}`, color: "var(--text)" }}
            />
            {customError && <p className="text-xs mb-2" style={{ color: "var(--danger)" }}>{customError}</p>}
            <div className="flex gap-3">
              <button onClick={handleCreateCustom} disabled={customId.trim().length < 1} className="flex-1 py-4 rounded-2xl text-lg font-bold disabled:opacity-40" style={{ background: "var(--accent)", color: "#fff" }}>
                ✅ Brug dette ID
              </button>
              <button onClick={handleCreate} className="py-4 px-4 rounded-2xl text-sm font-semibold" style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--muted)" }}>
                🎲 Tilfældig
              </button>
            </div>
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
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              💡 <strong>Gem denne kode!</strong> Hvis du mister forbindelsen, kan du genforbinde ved at skrive koden manuelt.
            </p>

            {/* Ret ID */}
            {editing ? (
              <div className="mb-4">
                <input
                  type="text"
                  value={editId}
                  onChange={(e) => { setEditId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"")); setEditError(""); }}
                  placeholder="Nyt room-ID..."
                  maxLength={20}
                  autoFocus
                  className="w-full rounded-xl px-4 py-3 text-xl font-bold text-center tracking-widest mb-2"
                  style={{ background: "var(--bg)", border: `2px solid ${editError ? "var(--danger)" : "var(--accent)"}`, color: "var(--text)" }}
                />
                {editError && <p className="text-xs mb-2" style={{ color: "var(--danger)" }}>{editError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(false); setEditId(""); setEditError(""); }}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--muted)" }}>
                    Annuller
                  </button>
                  <button onClick={handleEditSave} disabled={editId.trim().length < 4}
                    className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                    style={{ background: "var(--accent)", color: "#fff" }}>
                    Gem nyt ID
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setEditing(true); setEditId(localRoom ?? ""); }}
                className="w-full py-2 rounded-xl text-sm font-semibold mb-4"
                style={{ background: "var(--bg)", border: "2px solid var(--border)", color: "var(--muted)" }}>
                ✏️ Skift room-ID
              </button>
            )}

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
