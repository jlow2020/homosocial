import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import { TERMS_VERSION } from "@/lib/legal";
import { loadExtras, loadCommunity, bestLines } from "@/lib/profile/data";
import { photoUrls } from "@/lib/game/player";
import MakeItYours, { STEP_KEYS, type StepKey } from "./MakeItYours";

export const metadata: Metadata = { title: "Your profile | Homosocial" };
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
  const { step } = await searchParams;
  const startAt = (STEP_KEYS as readonly string[]).includes(step ?? "") ? (step as StepKey) : null;
  // Signing up: this is part two of the profile, then the Realness Check.
  const setup = !p.verified_at;

  return (
    <main className="apply-page">
      <PageHead
        title={setup ? "Make your profile" : "Your profile"}
        tag={setup ? <><span className="chy-hot">Step 2 of 3</span><span className="chy-light">Your profile</span></> : undefined}
        right={<Link href={setup ? "/verify" : "/profile"} className="topbar-link">{setup ? "Skip all" : "Done"}</Link>}
      />
      <div className="wrap">
        <MakeItYours
          extras={extras}
          community={community}
          seedText={[p.interests, p.hot_take, extras.basics.work, extras.basics.hometown, ...extras.answers.map((a) => a.body)].filter(Boolean).join(". ")}
          seed={me.userId}
          lines={lines}
          mainPhoto={main.get(p.photo_path) ?? null}
          startAt={startAt}
          finishHref={setup ? "/verify" : p.circle_id ? `/circle/guy/${me.userId}` : "/profile"}
        />
      </div>
    </main>
  );
}
