import Link from "next/link";
import { redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { promptOf, type Drop } from "@/lib/game/drops";
import { computeWeek, BADGES, type WeekResult } from "@/lib/game/lock";
import { standings } from "@/lib/game/standings";
import { etLabel } from "@/lib/game/clock";
import { Avatar, GuyName, Shell, weekTitle } from "../../ui";
import Waveform from "@/components/Waveform";

export const dynamic = "force-dynamic";

// The Sunday Read: one page per week. The best answer, the Census, who won,
// and the standings. Locks Sunday at 8pm; before that it's a live preview.
export default async function ReadPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const pl = await loadPlayer({ needSeat: true });
  const { db, clock, circle } = pl;
  const current = clock.phase === "season" ? clock.week : clock.phase === "revealed" ? 8 : 0;
  const week = Number(n);
  if (!Number.isInteger(week) || week < 1 || week > current) redirect("/circle");

  const { data: dropRow } = await db.from("drops").select("*").eq("circle_id", circle.id).eq("season_no", circle.season_no).eq("week", week).maybeSingle();
  if (!dropRow) redirect(`/circle/week/${week}`);
  const drop = dropRow as Drop;
  const prompt = promptOf(drop);
  const locked = !!drop.locked_at;
  const r: WeekResult = locked && drop.result ? (drop.result as WeekResult) : await computeWeek(db, drop, pl.members);
  const byId = new Map(pl.members.map((m) => [m.id, m]));
  const name = (id?: string | null) => (id ? byId.get(id)?.first_name ?? "Someone" : "Someone");
  const anonTop = prompt.mode === "anon";

  const [board, urls] = await Promise.all([
    standings(db, circle, pl.members),
    photoUrls(db, [...pl.members.map((m) => m.photo_path), r.top?.media_type === "photo" || (r.top && !r.top.media_type && r.top.photo_path) ? r.top.photo_path : null, drop.spec?.kind === "caption" ? drop.spec.photo_path : null]),
  ]);
  const topClip = r.top && (r.top.media_type === "video" || r.top.media_type === "audio") && r.top.photo_path ? (await db.storage.from("clips").createSignedUrl(r.top.photo_path, 3600)).data?.signedUrl : null;

  const readingUrl = r.reading ? (await db.storage.from("clips").createSignedUrl(r.reading.path, 3600)).data?.signedUrl : null;
  // The Chain, in full.
  let chain: { line: string; by: string }[] = [];
  if (drop.spec?.kind === "chain") {
    const { data } = await db.from("answers").select("user_id, data, created_at").eq("drop_id", drop.id).eq("passed", false).order("created_at");
    chain = (data ?? []).filter((a) => byId.has(a.user_id)).map((a) => ({ line: ((a.data as { line?: string })?.line ?? "") as string, by: name(a.user_id) }));
  }
  // Best story, in full.
  let story: string | null = null;
  if (r.story && drop.spec?.kind === "madlibs") {
    const { data } = await db.from("answers").select("data").eq("id", r.story.answer_id).maybeSingle();
    const w = ((data?.data as { words?: string[] })?.words ?? []) as string[];
    story = drop.spec.template.replace(/\{(\d+)\}/g, (_, i) => w[Number(i)] ?? "");
  }
  // Blind Date reveals.
  let dates: [string, string][] = [];
  if (drop.spec?.kind === "blinddate") {
    const { data } = await db.from("dm_threads").select("a, b").eq("blind_drop", drop.id);
    dates = (data ?? []).filter((t) => byId.has(t.a) && byId.has(t.b)).map((t) => [t.a, t.b]);
  }

  const weekBadges = board.flatMap((s) => s.badges.filter((b) => b.week === week).map((b) => ({ ...b, id: s.id })));
  const readAt = clock.phase === "season" && clock.nextDrop && week === clock.week ? new Date(clock.nextDrop.getTime() - 11 * 3600e3) : null;

  return (
    <Shell pl={pl}>
      <div className="week-nav">
        {week > 1 ? <Link href={`/circle/read/${week - 1}`}>← Week {week - 1}</Link> : <span />}
        {week < current ? <Link href={`/circle/read/${week + 1}`}>Week {week + 1} →</Link> : <span />}
      </div>
      <article className="read">
        <header className="read-head">
          <p className="eyebrow">The Sunday Read · Week {week}: {weekTitle(week)}</p>
          <h1 className="game-h1">{locked ? "That's a wrap." : "So far this week."}</h1>
          <p className="fine">
            {r.answered} of {r.of} answered.{" "}
            {locked ? `Locked ${etLabel(new Date(drop.locked_at!))}.` : readAt ? `Locks ${clock.phase === "season" && clock.testMode ? "when the week moves on" : etLabel(readAt)}.` : ""}
            {" "}<Link href={`/circle/week/${week}`}>The drop</Link>
          </p>
        </header>

        {r.top && (
          <section className="read-card read-top">
            <p className="eyebrow">🔥 Answer of the week · {r.top.reactions} {r.top.reactions === 1 ? "reaction" : "reactions"}</p>
            <div className="answer-head">
              {anonTop ? (
                <>
                  <span className="avatar anon-mask" style={{ width: 40, height: 40 }}>🎭</span>
                  <span className="guy-name">Anonymous</span>
                </>
              ) : (
                <>
                  <Avatar src={urls.get(byId.get(r.top.user_id)?.photo_path ?? "")} name={name(r.top.user_id)} size={40} />
                  <GuyName pl={pl} m={byId.get(r.top.user_id)} />
                </>
              )}
            </div>
            {r.top.photo_path && urls.get(r.top.photo_path) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls.get(r.top.photo_path)} alt="" className="answer-photo" />
            )}
            {topClip && r.top.media_type === "video" && <video src={topClip} controls playsInline preload="metadata" className="answer-photo" />}
            {topClip && r.top.media_type === "audio" && <audio src={topClip} controls preload="metadata" />}
            {r.top.body && <p className="read-quote">&ldquo;{r.top.body}&rdquo;</p>}
          </section>
        )}

        {r.census && (
          <section className="read-card">
            <p className="eyebrow">📊 The Census · {r.answered} answered</p>
            <ul className="census-list">
              {[...r.census].sort((a, b) => b.pct - a.pct).map((c) => (
                <li key={c.q}>
                  <span className="census-bar" style={{ width: `${c.pct}%` }} />
                  <span className="census-pct">{c.pct}%</span>
                  <span>{c.q}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {r.splits && (
          <section className="read-card">
            <p className="eyebrow">⚖️ How the Circle split</p>
            <ul className="splits">
              {r.splits.map((s) => (
                <li key={s.a}>
                  <span className={s.left >= 50 ? "win" : ""}>{s.a} {s.left}%</span>
                  <span className="split-bar"><span style={{ width: `${s.left}%` }} /></span>
                  <span className={s.left < 50 ? "win" : ""}>{100 - s.left}% {s.b}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {r.rank && (
          <Winner pl={pl} id={r.rank.winner} urls={urls} eyebrow={`👑 ${r.rank.category}`} line={`Ranked first by the Circle${r.rank.runner_up ? `, with ${name(r.rank.runner_up)} right behind him` : ""}. ${r.rank.ranked} guys ranked.`} />
        )}
        {r.caption && (
          <section className="read-card">
            <p className="eyebrow">💬 Caption Champ</p>
            {drop.spec?.kind === "caption" && urls.get(drop.spec.photo_path) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls.get(drop.spec.photo_path)} alt="" className="answer-photo" />
            )}
            <p className="read-quote">&ldquo;{r.caption.caption}&rdquo;</p>
            <p className="fine">{name(r.caption.user_id)} · {r.caption.reactions} reactions</p>
          </section>
        )}
        {r.superlatives && r.superlatives.winners.length > 0 && (
          <section className="read-card read-winner">
            <p className="eyebrow">🎖️ Rank Night · everybody got a title</p>
            {r.superlatives.titles[pl.profile.id] && (
              <p className="rn-mine">
                Yours: <b>{r.superlatives.titles[pl.profile.id].category}</b>
              </p>
            )}
            <ul className="rn-board">
              {r.superlatives.winners.map((w) => (
                <li key={w.category}>
                  <Avatar src={urls.get(byId.get(w.user_id)?.photo_path ?? "")} name={name(w.user_id)} size={40} />
                  <span>
                    <span className="fine">{w.category}</span>
                    <br />
                    <b>{name(w.user_id)}</b>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {r.guesser && <Winner pl={pl} id={r.guesser.user_id} urls={urls} eyebrow="🕵️ Best Guesser" line={`Called ${r.guesser.right} of ${r.guesser.of} right.`} />}
        {r.liar && <Winner pl={pl} id={r.liar.user_id} urls={urls} eyebrow="🤥 Best Liar" line={`Fooled ${r.liar.fooled} of ${r.liar.of} guys.`} />}
        {r.detective && <Winner pl={pl} id={r.detective.user_id} urls={urls} eyebrow="🔎 Lie Detector" line={`Caught ${r.detective.right} of ${r.detective.of} lies.`} />}
        {story && r.story && (
          <section className="read-card">
            <p className="eyebrow">📖 Best Story · {r.story.votes} votes</p>
            <p className="read-quote madlib">{story}</p>
            <p className="fine">by {name(r.story.user_id)}</p>
          </section>
        )}
        {r.reading && readingUrl && (
          <section className="read-card">
            <p className="eyebrow">🎙️ Best reading of The Chain · {r.reading.fires} 🔥</p>
            <div className="answer-head">
              <Avatar src={urls.get(byId.get(r.reading.user_id)?.photo_path ?? "")} name={name(r.reading.user_id)} size={40} />
              <GuyName pl={pl} m={byId.get(r.reading.user_id)} />
            </div>
            <Waveform src={readingUrl} />
          </section>
        )}
        {chain.length > 0 && (
          <section className="read-card">
            <p className="eyebrow">⛓️ The Chain · {chain.length} lines</p>
            <div className="chain">
              <p className="chain-line opener">{drop.spec?.kind === "chain" ? drop.spec.opener : ""}</p>
              {chain.map((c, i) => (
                <p key={i} className="chain-line">
                  {c.line} <span className="fine">· {c.by}</span>
                </p>
              ))}
            </div>
          </section>
        )}
        {dates.length > 0 && (
          <section className="read-card">
            <p className="eyebrow">💘 Blind Dates · {dates.length} {dates.length === 1 ? "pair" : "pairs"}</p>
            <ul className="pairs">
              {dates.map(([a, b]) => (
                <li key={a + b}>
                  <Avatar src={urls.get(byId.get(a)?.photo_path ?? "")} name={name(a)} size={36} /> {name(a)} <span className="fine">+</span>{" "}
                  <Avatar src={urls.get(byId.get(b)?.photo_path ?? "")} name={name(b)} size={36} /> {name(b)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {weekBadges.length > 0 && (
          <section className="read-card">
            <p className="eyebrow">🏅 Badges this week</p>
            <ul className="badge-list">
              {weekBadges.map((b) => (
                <li key={b.id + b.badge}>
                  <span className="badge-pill">{BADGES[b.badge]?.emoji} {b.label}</span> {name(b.id)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="read-card">
          <p className="eyebrow">📈 Season {circle.season_no} standings</p>
          <ol className="standings">
            {board.slice(0, 8).map((s, i) => (
              <li key={s.id}>
                <span className="standing-no">{i + 1}</span>
                <Avatar src={urls.get(byId.get(s.id)?.photo_path ?? "")} name={name(s.id)} size={32} />
                <span className="standing-name"><GuyName pl={pl} m={byId.get(s.id)} /></span>
                <span className="standing-stats">
                  🔥 {s.fire}
                  {s.badges.length > 0 && <> · {s.badges.map((b) => BADGES[b.badge]?.emoji ?? "🏅").join(" ")}</>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </Shell>
  );
}

async function Winner({ pl, id, urls, eyebrow, line }: { pl: Awaited<ReturnType<typeof loadPlayer>>; id: string; urls: Map<string, string>; eyebrow: string; line: string }) {
  const m = pl.members.find((x) => x.id === id);
  return (
    <section className="read-card read-winner">
      <p className="eyebrow">{eyebrow}</p>
      <div className="answer-head">
        <Avatar src={urls.get(m?.photo_path ?? "")} name={m?.first_name ?? ""} size={48} />
        <GuyName pl={pl} m={m} />
      </div>
      <p>{line}</p>
    </section>
  );
}
