"use client";
import { useEffect } from "react";
import { APP_VERSION } from "@/lib/version";

const STORAGE_KEY = "app-version";

export default function VersionCheck() {
  useEffect(() => {
    async function check() {
      try {
        // Hent version.json fra server — cache: no-store sikrer vi altid får den nyeste
        const res = await fetch("/version.json", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const serverVersion: string = data.version;
        const localVersion = localStorage.getItem(STORAGE_KEY);

        if (localVersion === null) {
          // Første gang — gem version og fortsæt
          localStorage.setItem(STORAGE_KEY, serverVersion);
          return;
        }

        if (serverVersion !== localVersion) {
          // Ny version fundet — ryd caches og reload
          localStorage.setItem(STORAGE_KEY, serverVersion);

          // Ryd Service Worker caches hvis de findes
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }

          // Hard reload (bypass browser cache)
          window.location.reload();
        }
      } catch {
        // Netværksfejl — ignorer stille
      }
    }

    check();
  }, []);

  return null;
}
