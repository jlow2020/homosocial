import type { Metadata } from "next";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { requireAdmin, ROLE_TITLE } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Admin | Homosocial",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const a = await requireAdmin();
  const { count: pending } = await a.db.from("mod_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
  return (
    <main className="admin">
      <TopBar
        right={
          <Link href="/circle" className="topbar-link">
            Back to my Circle
          </Link>
        }
      />
      <div className="wrap admin-head">
        <div className="chyron">
          <span className="chy-hot">{ROLE_TITLE[a.role]}</span>
          <span className="chy-light">@{a.me.username ?? "admin"}</span>
        </div>
        <nav className="admin-nav" aria-label="Admin">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/members">Members</Link>
          <Link href="/admin/circles">Circles</Link>
          <Link href="/admin/drops">Drops</Link>
          <Link href="/admin/moderation">Moderation{pending ? ` (${pending})` : ""}</Link>
          <Link href="/admin/reports">Reports</Link>
          <Link href="/admin/log">Log</Link>
        </nav>
      </div>
      <div className="wrap admin-body">{children}</div>
    </main>
  );
}
