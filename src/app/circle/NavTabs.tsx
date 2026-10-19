"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavTabs({ dropWeek, unread }: { dropWeek: number | null; unread: number }) {
  const path = usePathname();
  const tabs = [
    { href: "/circle", label: "Home", on: path === "/circle" },
    ...(dropWeek ? [{ href: `/circle/week/${dropWeek}`, label: "Drop", on: path.startsWith("/circle/week") }] : []),
    { href: "/circle/lounge", label: "Lounge", on: path.startsWith("/circle/lounge") },
    { href: "/circle/plans", label: "Plans", on: path.startsWith("/circle/plans") },
    { href: "/circle/dms", label: "DMs", on: path.startsWith("/circle/dms"), badge: unread },
    { href: "/circle/guys", label: "Guys", on: path.startsWith("/circle/guy") },
  ];
  return (
    <nav className="game-tabs" aria-label="Circle">
      <div className="wrap game-tabs-inner">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={t.on ? "game-tab on" : "game-tab"} aria-current={t.on ? "page" : undefined}>
            {t.label}
            {t.badge ? <span className="tab-badge">{t.badge}</span> : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
