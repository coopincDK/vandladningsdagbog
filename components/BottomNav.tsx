"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/registrer",   label: "Registrer", icon: "➕" },
  { href: "/dagbog",      label: "Dagbog",    icon: "📅" },
  { href: "/opsummering", label: "Overblik",  icon: "📊" },
  { href: "/ipss",        label: "IPSS",      icon: "📝" },
  { href: "/eksport",     label: "Eksport",   icon: "📄" },
  { href: "/sync",        label: "Sync",      icon: "☁️" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
      <div className="flex">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5" style={{ color: path === t.href ? "var(--accent)" : "var(--muted)" }}>
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
