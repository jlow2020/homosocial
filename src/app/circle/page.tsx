import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import MemberActions from "./MemberActions";
import { getMe, getSupabaseAdmin, nextPath } from "@/lib/supabase-server";
import { SEASON, ageFrom, regionName } from "@/lib/season";

export const metadata: Metadata = { title: "Your Circle | Homosocial" };
export const dynamic = "force-dynamic";

type Member = {
  id: string;
  first_name: string;
  birthdate: string;
  interests: string;
  hot_take: string;
  photo_path: string;
};

export default async function CirclePage() {
  const me = await getMe();
  if (!me) redirect("/join");
  const p = me.profile;
  if (!p) redirect("/profile");

  const nav = <Link href="/profile" className="topbar-link">Profile</Link>;

  if (p.status === "paused" || p.status === "banned") {
    return (
      <main className="apply-page">
        <PageHead title="Your account is paused" right={nav}>
          {p.status === "paused"
            ? "Several members reported your account, so it's paused while it gets reviewed."
            : "Your account was removed for breaking the house rules."}
        </PageHead>
      </main>
    );
  }
  if (nextPath(p) !== "/circle") redirect(nextPath(p));

  if (p.status === "waitlist" || !p.circle_id) {
    return (
      <main className="apply-page">
        <PageHead title="You're on the list" right={nav}>
          You passed your Realness Check. Homosocial isn&apos;t open near {p.zip} yet. When
          a Circle opens in your area, you&apos;re first in.
        </PageHead>
      </main>
    );
  }

  const db = getSupabaseAdmin()!;
  const [{ data: circle }, { data: members }, { data: blocks }] = await Promise.all([
    db.from("circles").select("number, region, capacity").eq("id", p.circle_id).single(),
    db
      .from("profiles")
      .select("id, first_name, birthdate, interests, hot_take, photo_path")
      .eq("circle_id", p.circle_id)
      .eq("status", "active")
      .not("verified_at", "is", null)
      .order("verified_at", { ascending: true }),
    db.from("blocks").select("blocker, blocked").or(`blocker.eq.${p.id},blocked.eq.${p.id}`),
  ]);

  const hidden = new Set((blocks ?? []).map((b) => (b.blocker === p.id ? b.blocked : b.blocker)));
  const visible = ((members ?? []) as Member[]).filter((m) => !hidden.has(m.id));
  const others = visible.filter((m) => m.id !== p.id);
  const self = visible.find((m) => m.id === p.id);
  const ordered = self ? [self, ...others] : others;

  const { data: signed } = await db.storage
    .from("photos")
    .createSignedUrls(ordered.map((m) => m.photo_path), 3600);
  const photo = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const total = (members ?? []).length;
  const capacity = circle?.capacity ?? SEASON.spots;

  return (
    <main className="apply-page">
      <PageHead title={`Circle ${circle?.number ?? ""}, ${regionName(circle?.region)}`} right={nav}>
        {SEASON.name} starts {SEASON.starts}. Your Circle is filling up: {total} of {capacity} guys
        so far. The Monday drop and the group thread open on day one.
      </PageHead>

      <section className="wrap members">
        <h2 className="members-title">Who&apos;s in</h2>
        <ul className="member-list">
          {ordered.map((m) => (
            <li key={m.id} className="member">
              {photo.get(m.photo_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.get(m.photo_path)!} alt={m.first_name} className="member-photo" />
              ) : (
                <span className="member-photo" aria-hidden="true" />
              )}
              <div className="member-body">
                <p className="member-name">
                  {m.first_name}, {ageFrom(m.birthdate)}
                  {m.id === p.id && <span className="member-you"> (you)</span>}
                </p>
                <p className="member-into">Into {m.interests}</p>
                <p className="member-take">&ldquo;{m.hot_take}&rdquo;</p>
                {m.id !== p.id && <MemberActions id={m.id} name={m.first_name} />}
              </div>
            </li>
          ))}
        </ul>
        {others.length === 0 && (
          <p className="empty">
            You&apos;re the first one here. Send homosocial.net to a guy who needs it.
          </p>
        )}
      </section>
    </main>
  );
}
