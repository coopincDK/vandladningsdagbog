"use client";
import { useSync } from "@/lib/useSync";

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  useSync();
  return <>{children}</>;
}
