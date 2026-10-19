import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import MemberActions from "./MemberActions";
import StaffBadge from "@/components/StaffBadge";
import FounderBadge from "@/components/FounderBadge";
import { getMe, getSupabaseAdmin, nextPath } from "@/lib/supabase-server";
import { SEASON, WEEKS, ageFrom } from "@/lib/season";
import { loadPlayer, photoUrls, type Player } from "@/lib/game/player";
import { ensureDrop, promptOf } from "@/lib/game/drops";
import { etLabel, untilLabel } from "@/lib/game/clock";
import { Avatar, GuyName, Shell, timeAgo, weekTitle } from "./ui";

export const metadata: Metadata = { title: "Your Circle | Homosocial" };
export const dynamic = "force-dynamic";

export default async function CirclePage() {
  const me = await getMe();
  if (!me) redirect("/signin");
  const p = me.profile;
  if (!p) redirect("/profile");

  const nav = (
    <Link href="/profile" className="topbar-link">
      Profile
    </Link>
  );
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
  if (nextPath(p, me.username) !== "/circle") redirect(nextPath(p, me.username));
  if (p.status === "waitlist" || !p.circle_id) {
    return (
      <main className="apply-page">
        <PageHead title="You're on the list" right={nav}>
          You passed your Realness Check. Season 1 is Florida only, and zip {p.zip} isn&apos;t in Florida. You&apos;re on
          the list for when we open near you. Typo? Fix your zip on your profile.
        </PageHead>
      </main>
    );
  }

  const pl = await loadPlayer();
  if (!pl.seated || pl.clock.phase === "filling") return <Lobby pl={pl} />;
  return <Home pl={pl} />;
}

// Before kickoff, or before his ID check: the seats and who's in.
async function Lobby({ pl }: { pl: Player }) {
  const db = getSupabaseAdmin()!;
  const p = pl.profile;
  const greenRoom = !pl.seated;
  // Guys in the lobby only see themselves.
  const ordered = greenRoom
    ? [
        ...(await db.from("profiles").select("id, first_name, birthdate, interests, hot_take, photo_path, looking_for, is_demo, email, founder_no").eq("id", p.id)).data!,
        ...pl.members,
      ]
    : [...pl.members.filter((m) => m.id === p.id), ...pl.members.filter((m) => m.id !== p.id)];
  const photo = await photoUrls(db, greenRoom ? [p.photo_path] : ordered.map((m) => m.photo_path));
  const total = pl.members.length;
  const capacity = pl.circle.capacity ?? SEASON.spots;
  const need = Math.max(SEASON.minToOpen - total, 0);

  return (
    <Shell pl={pl}>
      <div className="lobby-intro">
        <h1 className="game-h1">Circle {pl.circle.number}</h1>
        <p className="game-lede">
          {greenRoom
            ? "You're in the lobby. Look around. When you're ready to jump in, do your one-time ID check and the seat is yours."
            : "Your seat is yours. Your Circle kicks off the moment 9 seats are taken, and Week 1 starts right then."}
        </p>
      </div>

      {greenRoom && (
        <div className="greenroom">
          <h2>Grab your seat</h2>
          <p>
            Faces, the group chat and DMs unlock once you have a seat. It&apos;s a one-time ID check that takes about a
            minute. Every guy in your Circle did it, so everyone you meet is a real, verified adult.
          </p>
          <Link href="/verify/id" className="btn btn-gold">
            Do my ID check
          </Link>
        </div>
      )}

      <div className="casting">
        <span className="casting-count">
          <em>{total}</em> of {capacity} seats taken
        </span>
        <div className="seats" aria-hidden="true">
          {Array.from({ length: capacity }, (_, i) => (
            <span key={i} className={i < total ? "seat seat-taken" : i < SEASON.minToOpen ? "seat seat-min" : "seat"} />
          ))}
        </div>
        <p>
          {need > 0
            ? `${need} more ${need === 1 ? "guy" : "guys"} to kick off. Know someone who needs this? Send him homosocial.net.`
            : `${capacity - total} open seats left for late arrivals.`}
        </p>
      </div>

      <section className="members">
        <h2 className="members-title">Who&apos;s in</h2>
        <ul className="member-list">
          {ordered.map((m) => (
            <li key={m.id} className={greenRoom && m.id !== p.id ? "member member-hidden" : "member"}>
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
                <span className="badges">
                  {pl.titles.get(m.id) && <StaffBadge title={pl.titles.get(m.id)!} />}
                  {m.founder_no && <FounderBadge no={m.founder_no} />}
                </span>
                <p className="member-into">Into {m.interests}</p>
                {greenRoom && m.id !== p.id ? (
                  <p className="member-take">Grab your seat to see his face and his hot take.</p>
                ) : (
                  <p className="member-take">&ldquo;{m.hot_take}&rdquo;</p>
                )}
                {m.id !== p.id && !greenRoom && <MemberActions id={m.id} name={m.first_name} />}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}

async function Home({ pl }: { pl: Player }) {
  const { db, clock, circle } = pl;
  const revealed = clock.phase === "revealed";
  const week = clock.phase === "season" ? clock.week : 8;
  const drop = await ensureDrop(db, circle, week);
  const prompt = promptOf(drop);
  const byId = new Map(pl.members.map((m) => [m.id, m]));

  const [{ data: answers }, { data: lounge }, { data: plans }, { data: requests }] = await Promise.all([
    db.from("answers").select("user_id").eq("drop_id", drop.id),
    db.from("lounge_messages").select("id, user_id, body, created_at").eq("circle_id", circle.id).order("created_at", { ascending: false }).limit(3),
    db
      .from("plans")
      .select("id, title, place, starts_at, plan_rsvps(user_id)")
      .eq("circle_id", circle.id)
      .gte("starts_at", new Date(Date.now() - 6 * 3600e3).toISOString())
      .order("starts_at")
      .limit(2),
    db
      .from("dm_threads")
      .select("id, requested_by")
      .or(`a.eq.${pl.profile.id},b.eq.${pl.profile.id}`)
      .is("accepted_at", null)
      .neq("requested_by", pl.profile.id),
  ]);
  const answered = (answers ?? []).some((a) => a.user_id === pl.profile.id);
  const answerCount = (answers ?? []).length;
  const loungePhotos = await photoUrls(db, (lounge ?? []).map((l) => byId.get(l.user_id)?.photo_path));

  return (
    <Shell pl={pl}>
      <div className="home-grid">
        <section className="drop-card">
          <p className="eyebrow">
            {revealed ? "Week 8 drop" : `This week's drop`} · {answerCount} of {pl.members.length} answered
          </p>
          <h2 className="drop-prompt">{prompt.body}</h2>
          {prompt.hint && <p className="drop-hint">{prompt.hint}</p>}
          {prompt.anon && <p className="anon-note">🎭 Anonymous this week. Nobody sees who wrote what.</p>}
          <div className="row">
            <Link href={`/circle/week/${week}`} className={answered ? "btn btn-outline" : "btn btn-pink"}>
              {answered ? "See everyone's answers" : prompt.kind === "photo" ? "Post your photo" : "Answer to unlock"}
            </Link>
            {!answered && <span className="fine">Answers stay blurred until you post yours.</span>}
          </div>
          {clock.phase === "season" && clock.nextDrop && (
            <p className="fine">
              Week {week + 1}, {weekTitle(week + 1)}, drops {clock.testMode ? "when Daddy says so" : `${etLabel(clock.nextDrop)} (${untilLabel(clock.nextDrop)})`}.
            </p>
          )}
          {clock.phase === "season" && week === 8 && (
            <p className="fine">The Finale is {clock.testMode ? "one tap away" : `${etLabel(clock.finaleAt)} (${untilLabel(clock.finaleAt)})`}.</p>
          )}
        </section>

        {(week === 7 || week === 8) && !revealed && (
          <section className="event-card event-rose">
            <p className="eyebrow">Week 7</p>
            <h2>Roses</h2>
            <p>Say something kind about someone, out loud, by name. You get 3.</p>
            <Link href="/circle/roses" className="btn btn-gold">
              Give a Rose
            </Link>
          </section>
        )}

        {(week === 8 || revealed) && (
          <section className="event-card event-finale">
            <p className="eyebrow">{revealed ? "The Finale" : "Week 8"}</p>
            <h2>{revealed ? "Your mutuals are in" : "Make your picks"}</h2>
            <p>
              {revealed
                ? "Only picks that went both ways. Each one opens a chat."
                : "Private picks: friends, dates, and setups. Only mutuals get revealed."}
            </p>
            <Link href="/circle/finale" className="btn btn-pink">
              {revealed ? "See who picked you back" : "Make my picks"}
            </Link>
          </section>
        )}

        {(requests ?? []).length > 0 && (
          <section className="mini-card">
            <h3>Someone slid in</h3>
            {(requests ?? []).map((r) => (
              <p key={r.id}>
                <Link href={`/circle/dms/${r.id}`}>{byId.get(r.requested_by)?.first_name ?? "Someone"} wants to DM you</Link>
              </p>
            ))}
          </section>
        )}

        <section className="mini-card">
          <div className="mini-head">
            <h3>The Lounge</h3>
            <Link href="/circle/lounge">Open</Link>
          </div>
          {(lounge ?? []).length === 0 ? (
            <p className="fine">Quiet in here. Say something.</p>
          ) : (
            <ul className="mini-list">
              {[...(lounge ?? [])].reverse().map((l) => {
                const m = byId.get(l.user_id);
                return (
                  <li key={l.id}>
                    <Avatar src={m ? loungePhotos.get(m.photo_path) : undefined} name={m?.first_name ?? ""} size={32} />
                    <span>
                      <b>{m?.first_name ?? "Someone"}</b> {l.body}
                      <span className="fine"> · {timeAgo(l.created_at)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mini-card">
          <div className="mini-head">
            <h3>Plans</h3>
            <Link href="/circle/plans">All plans</Link>
          </div>
          {(plans ?? []).length === 0 ? (
            <p className="fine">Nothing on the calendar. Post the first plan.</p>
          ) : (
            <ul className="mini-list">
              {(plans ?? []).map((pl2) => (
                <li key={pl2.id}>
                  <span>
                    <b>{pl2.title}</b>
                    <span className="fine">
                      {" "}
                      · {pl2.starts_at ? etLabel(new Date(pl2.starts_at)) : "time TBD"} · {(pl2.plan_rsvps as unknown[]).length} going
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mini-card season-strip">
          <h3>Season {circle.season_no}</h3>
          <ol className="strip">
            {WEEKS.map((w) => {
              const state = w.n < week || revealed ? "past" : w.n === week ? "now" : "next";
              return (
                <li key={w.n} className={`strip-${state}`}>
                  {state === "next" ? (
                    <span>
                      <b>{w.n}</b> {w.title}
                    </span>
                  ) : (
                    <Link href={`/circle/week/${w.n}`}>
                      <b>{w.n}</b> {w.title}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </Shell>
  );
}
