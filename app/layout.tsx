import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import HydrationGate from "@/components/HydrationGate";
import SyncProvider from "@/components/SyncProvider";
import VersionCheck from "@/components/VersionCheck";

export const metadata: Metadata = {
  title: "Vandladningsdagbog",
  description: "Digital væske- og vandladningsdagbog",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.webp",
    apple: "/icon.webp",
  },
};
export const viewport: Viewport = { themeColor: "#0f172a", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className="dark">
      <body className="flex flex-col min-h-dvh" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <HydrationGate>
          <VersionCheck />
          <SyncProvider>
            <main className="flex-1 overflow-y-auto pb-24">{children}</main>
            <BottomNav />
          </SyncProvider>
        </HydrationGate>
      </body>
    </html>
  );
}
