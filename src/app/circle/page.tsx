import type { Metadata } from "next";
import SeatRing from "@/components/SeatRing";
import InviteButton from "@/components/InviteButton";
import { loadExtras } from "@/lib/profile/data";
import { placeMember, rehomeIfAlone } from "@/lib/game/place";
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
import HeatVote from "./HeatVote";
import { targetHeat } from "@/lib/game/engine";
import { myRecap } from "@/lib/game/recap";

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
  const pp = p as typeof p & { paused_until?: string | null; pause_reason?: string | null };
  // A timed pause ends on its own.
  if (p.status === "paused" && pp.paused_until && new Date(pp.paused_until) <= new Date()) {
    await getSupabaseAdmin()!.from("profiles").update({ status: "active", paused_until: null, pause_reason: null, paused_at: null }).eq("id", p.id);
    redirect("/circle");
  }
  if (p.status === "paused" || p.status === "banned") {
    const until = pp.paused_until ? new Date(pp.paused_until).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" }) : null;
    return (
      <main className="apply-page">
        <PageHead title="Your account is paused" right={nav}>
          {p.status === "banned"
            ? "Your account was removed for breaking the house rules."
            : pp.pause_reason === "strikes"
              ? until
                ? `You got a second strike for breaking the house rules, so your account is paused until ${until}. You'll be back in your Circle after that.`
                : "You got a third strike for breaking the house rules. Your account is paused until a person reviews it. Questions? Email support@homosocial.net."
              : "Several members reported your account, so it's paused while it gets reviewed."}
        </PageHead>
      </main>
    );
  }
  if (nextPath(p, me.username, me.terms) !== "/circle") redirect(nextPath(p, me.username, me.terms));
  // Nationwide now: anyone waiting for a seat gets one.
  if ((p.status === "waitlist" || (p.status === "active" && !p.circle_id)) && p.verified_at) {
    const db = getSupabaseAdmin()!;
    if (p.status === "waitlist") await db.from("profiles").update({ status: "active" }).eq("id", p.id).eq("status", "waitlist");
    if (await placeMember(db, p.id)) redirect("/circle");
  }
  if (p.status === "waitlist" || !p.circle_id) {
    return (
      <main className="apply-page">
        <PageHead title="Almost there" right={nav}>
          We couldn&apos;t find a Circle for you. Check your zip on your profile.
        </PageHead>
      </main>
    );
  }

  let pl = await loadPlayer();
  // Alone in his Circle while another one has room: he joins that one instead of waiting.
  if (pl.seated && pl.members.length < 2 && (await rehomeIfAlone(pl.db, pl.profile.id))) pl = await loadPlayer();
  if (pl.waiting) return <Lobby pl={pl} />;
  return <Home pl={pl} />;
}

// Before his Circle starts, or before his ID check: a waiting room.
async function Lobby({ pl }: { pl: Player }) {
  const db = getSupabaseAdmin()!;
  const p = pl.profile;
  const greenRoom = !pl.seated;
  const others = pl.members.filter((m) => m.id !== p.id);
  const taken = pl.members.length + (greenRoom ? 1 : 0);
  const capacity = pl.circle.capacity ?? SEASON.spots;
  const [photo, extras] = await Promise.all([photoUrls(db, [p.photo_path, ...others.map((m) => m.photo_path)]), loadExtras(db, p.id)]);
  const thin = extras.answers.length < 3 || extras.photos.length === 0 || extras.interests.length === 0;
  // Guys already placed here who are still finishing sign-up (ID check).
  const { count: arriving } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("circle_id", pl.circle.id)
    .eq("status", "active")
    .is("id_verified_at", null)
    .neq("id", p.id);

  return (
    <Shell pl={pl}>
      <section className="waiting">
        <SeatRing capacity={capacity} taken={taken} photo={photo.get(p.photo_path) ?? null} />
        <div className="waiting-copy">
          {greenRoom ? (
            <>
              <h1 className="game-h1">One last step.</h1>
              <p className="game-lede">
                {others.length > 0
                  ? `${others.length} ${others.length === 1 ? "guy is" : "guys are"} already in your Circle. Do your ID check to start playing.`
                  : "Do your ID check to start playing."}
              </p>
              <div className="waiting-actions">
                <Link href="/verify/id" className="btn btn-gold">
                  Do my ID check
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="game-h1">{others.length === 0 && pl.clock.phase === "filling" ? "You're first." : "Almost there."}</h1>
              <p className="game-lede">
                {arriving
                  ? `${arriving === 1 ? "Someone is" : `${arriving} guys are`} finishing sign-up now. Your Circle starts the moment one of them is done.`
                  : "Your Circle starts the moment another guy joins."}
              </p>
              <div className="waiting-actions">
                <InviteButton />
                {thin && (
                  <Link href="/profile" className="btn btn-outline">
                    Finish your profile
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {!greenRoom && others.length > 0 && (
        <section className="members">
          <h2 className="members-title">Who&apos;s in</h2>
          <ul className="member-list">
            {others.map((m) => (
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
                  </p>
                  <span className="badges">
                    {pl.titles.get(m.id) && <StaffBadge title={pl.titles.get(m.id)!} />}
                    {m.founder_no && <FounderBadge no={m.founder_no} />}
                  </span>
                  <p className="member-into">Into {m.interests}</p>
                  <MemberActions id={m.id} name={m.first_name} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
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
    db.from("lounge_messages").select("id, user_id, body, created_at").eq("circle_id", circle.id).eq("held", false).order("created_at", { ascending: false }).limit(3),
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
  const { data: heatVotes } = await db.from("heat_votes").select("user_id").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const { data: lockedRows } = await db.from("drops").select("week, locked_at").eq("circle_id", circle.id).eq("season_no", circle.season_no).not("locked_at", "is", null).order("week", { ascending: false }).limit(1);
  const lastRead = lockedRows?.[0]?.week as number | undefined;
  const readAt = clock.phase === "season" && clock.nextDrop ? new Date(clock.nextDrop.getTime() - 11 * 3600e3) : null;
  const heatNeeded = Math.max(2, Math.ceil(pl.members.length * 0.6));
  const answered = (answers ?? []).some((a) => a.user_id === pl.profile.id);
  const answerCount = (answers ?? []).length;
  const loungePhotos = await photoUrls(db, (lounge ?? []).map((l) => byId.get(l.user_id)?.photo_path));
  const recap = week >= 2 ? await myRecap(db, circle, pl.profile.id, pl.members, revealed ? 9 : week) : [];

  return (
    <Shell pl={pl}>
      {recap.length > 0 && (
        <section className="recap" aria-label="Your Season so far">
          <p className="recap-eyebrow">
            <span className="recap-dot" aria-hidden="true" />
            Your Season so far
          </p>
          <ul className="recap-reel">
            {recap.map((m, i) => (
              <li key={i} className={`recap-card recap-${m.tone}`}>
                <span className="recap-chy">{m.label}</span>
                <span className="recap-stat">{m.stat}</span>
                <span className="recap-line">{m.line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="home-grid">
        <section className="drop-card">
          <p className="eyebrow">
            {revealed ? "Week 8 drop" : `This week's drop`} · {answerCount} of {pl.members.length} answered
          </p>
          <h2 className="drop-prompt">{prompt.body}</h2>
          {prompt.credit && <p className="drop-credit">This week&apos;s drop by {prompt.credit}</p>}
          {prompt.hint && <p className="drop-hint">{prompt.hint}</p>}
          {prompt.anon && <p className="anon-note">🎭 Anonymous this week. Nobody sees who wrote what.</p>}
          <div className="row">
            <Link href={`/circle/week/${week}`} className={answered ? "btn btn-outline" : "btn btn-pink"}>
              {answered ? "See everyone's answers" : prompt.spec ? "Play to unlock" : prompt.kind === "photo" ? "Post your photo" : "Answer to unlock"}
            </Link>
          </div>
          {clock.phase === "season" && clock.nextDrop && (
            <p className="fine">
              Week {week + 1}, {weekTitle(week + 1)}, drops {`${etLabel(clock.nextDrop, circle.tz ?? undefined)} (${untilLabel(clock.nextDrop)})`}.
            </p>
          )}
          {clock.phase === "season" && week === 8 && (
            <p className="fine">The Finale is {`${etLabel(clock.finaleAt, circle.tz ?? undefined)} (${untilLabel(clock.finaleAt)})`}.</p>
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

        <section className="mini-card read-card-home">
          <div className="mini-head">
            <h3>📰 The Sunday Read</h3>
            {lastRead && <Link href={`/circle/read/${lastRead}`}>Week {lastRead}</Link>}
          </div>
          <p className="fine">
            {lastRead ? `Week ${lastRead} is out. ` : "Sundays, 8pm. "}
            {!revealed && <Link href={`/circle/read/${week}`}>{readAt && clock.phase === "season" ? `Week ${week} locks ${etLabel(readAt, circle.tz ?? undefined)}` : `Week ${week} so far`}</Link>}
          </p>
        </section>

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
                      · {pl2.starts_at ? etLabel(new Date(pl2.starts_at), circle.tz ?? undefined) : "time TBD"} · {(pl2.plan_rsvps as unknown[]).length} going
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!revealed && week < 8 && (
          <HeatVote
            votes={(heatVotes ?? []).length}
            needed={heatNeeded}
            mine={(heatVotes ?? []).some((v) => v.user_id === pl.profile.id)}
            heat={targetHeat(circle, week + 1)}
          />
        )}

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
