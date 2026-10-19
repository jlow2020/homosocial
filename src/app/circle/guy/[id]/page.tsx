import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { badgesFor } from "@/lib/game/standings";
import { BADGES } from "@/lib/game/lock";
import { UUID } from "@/lib/admin";
import { ageFrom } from "@/lib/season";
import { promptOf, type Drop } from "@/lib/game/drops";
import StaffBadge from "@/components/StaffBadge";
import FounderBadge from "@/components/FounderBadge";
import MemberActions from "../../MemberActions";
import { startDm } from "../../game-actions";
import { Shell, weekTitle } from "../../ui";

export const dynamic = "force-dynamic";

export default async function Guy({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const pl = await loadPlayer({ needSeat: true });
  if (id === pl.profile.id) redirect("/profile");
  const m = pl.members.find((x) => x.id === id);
  if (!m) notFound();

  // His answers this Season, but only on drops you've answered too.
  const { data: drops } = await pl.db
    .from("drops")
    .select("id, circle_id, season_no, week, prompt_id, created_at")
    .eq("circle_id", pl.circle.id)
    .eq("season_no", pl.circle.season_no)
    .order("week");
  const dropIds = (drops ?? []).map((d) => d.id);
  const { data: answers } = dropIds.length
    ? await pl.db.from("answers").select("drop_id, user_id, body, photo_path, passed").in("drop_id", dropIds).in("user_id", [id, pl.profile.id])
    : { data: [] };
  const mineDone = new Set((answers ?? []).filter((a) => a.user_id === pl.profile.id).map((a) => a.drop_id));
  const his = (answers ?? []).filter((a) => a.user_id === id && !a.passed);
  const { data: thread } = await pl.db
    .from("dm_threads")
    .select("id")
    .eq("a", [id, pl.profile.id].sort()[0])
    .eq("b", [id, pl.profile.id].sort()[1])
    .maybeSingle();
  const urls = await photoUrls(pl.db, [m.photo_path, ...his.map((a) => a.photo_path)]);
  const badges = await badgesFor(pl.db, m.id);

  return (
    <Shell pl={pl}>
      <section className="guy-hero">
        {urls.get(m.photo_path) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urls.get(m.photo_path)} alt="" className="guy-hero-photo" />
        ) : (
          <span className="guy-hero-photo" />
        )}
        <div className="guy-hero-body">
          <h1 className="game-h1">
            {m.first_name}, {ageFrom(m.birthdate)}
          </h1>
          <span className="badges">
                  {pl.titles.get(m.id) && <StaffBadge title={pl.titles.get(m.id)!} />}
                  {m.founder_no && <FounderBadge no={m.founder_no} />}
                </span>
          <p className="member-into">Into {m.interests}</p>
          <p className="member-take">&ldquo;{m.hot_take}&rdquo;</p>
          {badges.length > 0 && (
            <ul className="badge-list">
              {badges.map((b, i) => (
                <li key={i}>
                  <span className="badge-pill" title={BADGES[b.badge]?.blurb}>
                    {BADGES[b.badge]?.emoji ?? "🏅"} {b.label}
                  </span>
                  <span className="fine"> S{b.season_no}{b.week < 9 ? ` W${b.week}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="row">
            {thread ? (
              <Link href={`/circle/dms/${thread.id}`} className="btn btn-pink">
                Open your DMs
              </Link>
            ) : (
              <form action={startDm.bind(null, m.id)}>
                <button className="btn btn-pink">Message {m.first_name}</button>
              </form>
            )}
            <MemberActions id={m.id} name={m.first_name} />
          </div>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 className="admin-h3">His Season so far</h2>
        <ul className="answer-list">
          {((drops ?? []) as Drop[]).map((d) => {
            const a = his.find((x) => x.drop_id === d.id);
            // Anonymous drops never show up on anyone's page.
            if (!a || promptOf(d).anon) return null;
            const unlocked = mineDone.has(d.id);
            return (
              <li key={d.id} className={unlocked ? "answer" : "answer answer-locked"}>
                <p className="eyebrow">
                  Week {d.week}: {weekTitle(d.week)}
                </p>
                <p className="answer-prompt">{promptOf(d).body}</p>
                {unlocked ? (
                  <>
                    {a.photo_path && urls.get(a.photo_path) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urls.get(a.photo_path)} alt="" className="answer-photo" />
                    )}
                    {a.body && <p className="answer-body">{a.body}</p>}
                  </>
                ) : (
                  <p className="fine">
                    🔒 <Link href={`/circle/week/${d.week}`}>Answer Week {d.week}</Link> to see his.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {his.filter((a) => !promptOf((drops ?? []).find((d) => d.id === a.drop_id) as Drop).anon).length === 0 && <p className="fine">He hasn&apos;t answered a drop yet this Season.</p>}
      </section>
    </Shell>
  );
}
