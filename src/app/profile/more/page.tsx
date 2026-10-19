import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import { TERMS_VERSION } from "@/lib/legal";
import { loadExtras, loadCommunity, bestLines, completeness } from "@/lib/profile/data";
import { photoUrls } from "@/lib/game/player";
import MakeItYours from "./MakeItYours";

export const metadata: Metadata = { title: "Make it yours | Homosocial" };
export const dynamic = "force-dynamic";

export default async function More({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/signin");
  if (!me.username) redirect("/account");
  if (me.terms !== TERMS_VERSION) redirect("/agree");
  if (!me.profile) redirect("/profile");
  const db = getSupabaseAdmin()!;
  const p = me.profile;
  const [extras, community, lines, main] = await Promise.all([
    loadExtras(db, me.userId),
    loadCommunity(db, p.circle_id, me.userId),
    bestLines(db, me.userId, 8),
    photoUrls(db, [p.photo_path]),
  ]);
  const done = completeness(extras, !!p.photo_path);
  const { step } = await searchParams;
  const startAt = Math.max(0, Math.min(6, Number(step) || 0));

  return (
    <main className="apply-page">
      <PageHead title="Make it yours" right={<Link href="/circle" className="topbar-link">Back to my Circle</Link>}>
        Two minutes, mostly taps. The game fills in the rest as you play.
      </PageHead>
      <div className="wrap">
        <div className="meter" role="progressbar" aria-valuenow={done.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile complete">
          <span style={{ width: `${done.pct}%` }} />
        </div>
        <p className="fine">
          {done.pct}% there{done.next ? `. Next: ${done.next.toLowerCase()}.` : ". Looking good."}
        </p>
        <MakeItYours
          extras={extras}
          community={community}
          seedText={[p.interests, p.hot_take, extras.basics.work, extras.basics.hometown, ...extras.answers.map((a) => a.body)].filter(Boolean).join(". ")}
          seed={me.userId}
          lines={lines}
          meId={me.userId}
          mainPhoto={main.get(p.photo_path) ?? null}
          startAt={startAt}
        />
      </div>
    </main>
  );
}
