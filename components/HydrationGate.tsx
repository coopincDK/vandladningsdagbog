"use client";
import { useEffect, useState } from "react";

export default function HydrationGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  if (!ok) return <div className="flex items-center justify-center min-h-dvh"><p style={{ color: "var(--muted)" }}>Indlæser…</p></div>;
  return <>{children}</>;
}
