import Link from "next/link";
import { redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { ensureDrop, promptOf } from "@/lib/game/drops";
import { Avatar, GuyName, Shell, timeAgo, weekTitle } from "../../ui";
import AnswerForm from "./AnswerForm";
import Reactions from "./Reactions";
import ReplyBox from "./ReplyBox";
import GuessWho from "./GuessWho";
import WriteDrop from "./WriteDrop";
import PlayForm from "./PlayForm";
import LieVote from "./LieVote";
import StoryVote from "./StoryVote";
import ReportAnswer from "./ReportAnswer";
import OwnerDeck from "./OwnerDeck";
import Veil from "./Veil";
import { FireReading, RecordReading } from "./ReadAloud";
import Waveform from "@/components/Waveform";
import Live from "../../Live";
import { compile } from "@/lib/game/playcheck";
import { PLAY_MODES } from "@/lib/game/plays";
import { chainEndingAt } from "@/lib/game/chain";
import type { WeekResult } from "@/lib/game/lock";
import { etLabel } from "@/lib/game/clock";

export const dynamic = "force-dynamic";

type AnswerRow = {
  id: string;
  user_id: string;
  body: string | null;
  photo_path: string | null;
  media_type: "photo" | "video" | "audio" | null;
  data: Record<string, unknown> | null;
  passed: boolean;
  hidden: boolean;
  held: boolean;
  veiled: boolean;
  ready: boolean;
  created_at: string;
  reactions: { user_id: string; emoji: string }[];
  replies: { id: string; user_id: string; body: string; created_at: string; held: boolean }[];
};

export default async function WeekPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const pl = await loadPlayer({ needSeat: true });
  const { db, clock, circle } = pl;
  const current = clock.phase === "season" ? clock.week : clock.phase === "revealed" ? 8 : 0;
  const week = Number(n);
  if (!Number.isInteger(week) || week < 1 || week > current) redirect("/circle");

  const drop = await ensureDrop(db, circle, week);
  const prompt = promptOf(drop);
  const locked = drop.locked_at && drop.result ? (drop.result as unknown as WeekResult) : null;
  const over = week < current || clock.phase === "revealed";
  const { data } = await db
    .from("answers")
    .select("id, user_id, body, photo_path, media_type, data, passed, hidden, held, veiled, ready, created_at, reactions(user_id, emoji), replies(id, user_id, body, created_at, held)")
    .eq("drop_id", drop.id)
    .order("created_at", { ascending: true });
  const memberIds = new Set(pl.members.map((m) => m.id));
  const all = ((data ?? []) as AnswerRow[]).filter((a) => memberIds.has(a.user_id));
  // Pulled after reports, or held by the filter: only the guy who posted it sees it.
  const rows = all
    .filter((a) => (!a.hidden && !a.held) || a.user_id === pl.profile.id)
    .map((a) => ({ ...a, replies: a.replies.filter((r) => !r.held || r.user_id === pl.profile.id) }));
  const mine = rows.find((a) => a.user_id === pl.profile.id);
  const anon = !!prompt.anon;
  // Anonymous drops: no names, no faces, and no posting order to give anyone away.
  const others = rows
    .filter((a) => a.user_id !== pl.profile.id && !a.passed)
    .sort((x, y) => (anon ? x.id.localeCompare(y.id) : 0));
  const byId = new Map(pl.members.map((m) => [m.id, m]));
  const name = (id?: string | null) => (id ? byId.get(id)?.first_name ?? "Someone" : "Someone");

  // One Pass per Season.
  const { data: seasonDrops } = await db.from("drops").select("id").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const { count: passes } = await db
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", pl.profile.id)
    .eq("passed", true)
    .in("drop_id", (seasonDrops ?? []).map((d) => d.id));

  // Guess Who and Guess the Owner: the names come out when the week is over.
  const guessing = prompt.mode === "guesswho" || prompt.mode === "owner";
  const revealed = guessing && over;
  const { data: guessRows } = guessing ? await db.from("guesses").select("guesser, answer_id, guessed").eq("drop_id", drop.id) : { data: [] };
  const myGuesses = new Map((guessRows ?? []).filter((g) => g.guesser === pl.profile.id).map((g) => [g.answer_id as string, g.guessed as string]));
  const right = revealed ? [...myGuesses].filter(([aid, who]) => rows.find((a) => a.id === aid)?.user_id === who).length : 0;
  const { data: myBank } = await db
    .from("prompt_bank")
    .select("id, body, status, times_used, created_at")
    .eq("author_id", pl.profile.id)
    .order("created_at", { ascending: false });
  const myDrops = (myBank ?? []).filter((b) => new Date(b.created_at) > new Date(Date.now() - 60 * 864e5)).length;

  // Two Truths: votes, and the reveal when the week ends.
  const isPlay = (PLAY_MODES as string[]).includes(prompt.mode);
  const twoTruths = prompt.mode === "twotruths";
  const lieRevealed = twoTruths && over;
  const { data: voteRows } = twoTruths ? await db.from("votes").select("voter, answer_id, choice").eq("drop_id", drop.id) : { data: [] };
  const myVotes = new Map((voteRows ?? []).filter((v) => v.voter === pl.profile.id).map((v) => [v.answer_id as string, v.choice as number]));
  const lieRight = lieRevealed ? [...myVotes].filter(([aid, c]) => (rows.find((a) => a.id === aid)?.data?.lie as number | undefined) === c).length : 0;
  const fooled = (a: AnswerRow) => {
    const v = (voteRows ?? []).filter((x) => x.answer_id === a.id && memberIds.has(x.voter));
    return { of: v.length, fooled: v.filter((x) => x.choice !== (a.data?.lie as number)).length };
  };

  // Circle Census: the totals, once he's answered. Plus everyone's.
  const spec = prompt.spec;
  const answeredPlays = rows.filter((a) => !a.passed && a.data);
  const census =
    mine && spec?.kind === "survey" && spec.census && answeredPlays.length >= 3
      ? spec.questions.map((q, i) => ({ q, pct: Math.round((100 * answeredPlays.filter((a) => (a.data!.answers as boolean[])[i]).length) / answeredPlays.length) }))
      : null;
  let florida: { pct: number[]; n: number } | null = null;
  if (census && spec?.kind === "survey") {
    const { data: sameDrops } = await db.from("drops").select("id").eq("prompt_id", drop.prompt_id);
    const ids = (sameDrops ?? []).map((d) => d.id as string);
    if (ids.length) {
      const { data: fl } = await db.from("answers").select("data").in("drop_id", ids).eq("passed", false).not("data", "is", null);
      const list = (fl ?? []).map((a) => (a.data as { answers?: boolean[] }).answers).filter((x): x is boolean[] => Array.isArray(x));
      if (list.length >= Math.max(3, answeredPlays.length + 1)) {
        florida = { n: list.length, pct: spec.questions.map((_, i) => Math.round((100 * list.filter((x) => x[i]).length) / list.length)) };
      }
    }
  }
  const anonSurvey = spec?.kind === "survey" && !!spec.anon;
  const splits =
    mine && spec?.kind === "thisorthat" && answeredPlays.length >= 3
      ? spec.pairs.map(([a, b], i) => {
          const left = answeredPlays.filter((x) => (x.data!.picks as number[])[i] === 0).length;
          return { a, b, left: Math.round((100 * left) / answeredPlays.length) };
        })
      : null;
  const agree =
    mine?.data && spec?.kind === "thisorthat"
      ? answeredPlays
          .filter((a) => a.user_id !== pl.profile.id)
          .map((a) => ({ name: byId.get(a.user_id)?.first_name ?? "?", n: spec.pairs.filter((_, i) => (a.data!.picks as number[])[i] === (mine.data!.picks as number[])[i]).length }))
          .sort((x, y) => y.n - x.n)
          .slice(0, 3)
      : [];

  const chain = spec?.kind === "chain";
  const chainLines = chain ? rows.filter((a) => !a.passed).length : 0;
  const chainEnd = chainEndingAt(pl.members.length);
  const chainDone = chain && rows.some((a) => a.data?.ending === true);
  const open = !!mine || chain; // The Chain is readable before you add your line.
  const rankLive =
    spec?.kind === "rank" && answeredPlays.length >= 3
      ? (() => {
          const pts = new Map<string, number>();
          for (const a of answeredPlays) (a.data!.order as string[]).forEach((id, i) => pts.set(id, (pts.get(id) ?? 0) + (5 - i)));
          return [...pts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([id]) => name(id));
        })()
      : null;
  const captionUrl = spec?.kind === "caption" ? (await photoUrls(db, [spec.photo_path])).get(spec.photo_path) : undefined;
  const lockLabel = clock.phase === "season" && clock.nextDrop && week === clock.week ? etLabel(new Date(clock.nextDrop.getTime() - 11 * 3600e3), circle.tz ?? undefined) : "Sunday at 8pm";

  // Mad Libs votes.
  const { data: storyRows } = spec?.kind === "madlibs" ? await db.from("story_votes").select("voter, answer_id").eq("drop_id", drop.id) : { data: [] };
  const myStory = (storyRows ?? []).find((v) => v.voter === pl.profile.id)?.answer_id as string | undefined;
  const storyVotes = (id: string) => (storyRows ?? []).filter((v) => v.answer_id === id).length;

  // Hot Seat: which questions he's answered (his replies) and which he dodged.
  const seatId = spec?.kind === "hotseat" ? spec.seat : null;
  const questions = seatId ? rows.filter((a) => a.user_id !== seatId && a.data?.question) : [];
  const seatAnswered = questions.filter((q) => q.replies.some((r) => r.user_id === seatId)).length;

  // The Chain, read aloud.
  type Reading = { id: string; user_id: string; path: string; ready: boolean; reading_fires: { user_id: string }[] };
  const readings: Reading[] = chainDone
    ? (((await db.from("chain_readings").select("id, user_id, path, ready, reading_fires(user_id)").eq("drop_id", drop.id).order("created_at")).data ?? []) as Reading[]).filter((r) => memberIds.has(r.user_id))
    : [];
  const readingUrls = readings.filter((r) => r.ready).length
    ? new Map(((await db.storage.from("clips").createSignedUrls(readings.filter((r) => r.ready).map((r) => r.path), 3600)).data ?? []).map((x) => [x.path as string, x.signedUrl as string]))
    : new Map<string, string>();
  const readingUrlsAll = readingUrls;
  const urlsForReaders = chainDone ? await photoUrls(db, readings.map((r) => byId.get(r.user_id)?.photo_path)) : new Map<string, string>();

  const samePose = drop.prompt_id.startsWith("tpl:samepose");
  const converting = rows.some((a) => !a.ready);
  const clipPaths = rows.filter((a) => (a.media_type === "video" || a.media_type === "audio") && a.photo_path && a.ready).map((a) => a.photo_path as string);
  const clips = open && clipPaths.length
    ? new Map(((await db.storage.from("clips").createSignedUrls(clipPaths, 3600)).data ?? []).map((x) => [x.path as string, x.signedUrl as string]))
    : new Map<string, string>();
  const urls = open
    ? await photoUrls(db, [...pl.members.map((m) => m.photo_path), ...rows.filter((a) => a.media_type === "photo" || (!a.media_type && a.photo_path)).map((a) => a.photo_path)])
    : await photoUrls(db, [pl.profile.photo_path]);
  const guyList = pl.members.map((m) => ({ id: m.id, name: m.first_name, photo: urls.get(m.photo_path) ?? null }));
  const ownerDeck = prompt.mode === "owner" && mine && !revealed;

  const Media = ({ a }: { a: AnswerRow }) => (
    <>
      {!a.ready && a.photo_path && <p className="converting">⏳ Converting so it plays everywhere. A minute, tops.</p>}
      {a.photo_path && urls.get(a.photo_path) && (a.veiled && a.user_id !== pl.profile.id ? (
        <Veil src={urls.get(a.photo_path)!} kind="photo" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urls.get(a.photo_path)} alt="" className="answer-photo" loading="lazy" />
      ))}
      {a.media_type === "video" && a.photo_path && clips.get(a.photo_path) && (a.veiled && a.user_id !== pl.profile.id ? (
        <Veil src={clips.get(a.photo_path)!} kind="video" />
      ) : (
        <video src={clips.get(a.photo_path)} controls playsInline preload="metadata" className="answer-photo" />
      ))}
      {a.media_type === "audio" && a.photo_path && clips.get(a.photo_path) && <Waveform src={clips.get(a.photo_path)!} />}
    </>
  );

  return (
    <Shell pl={pl}>
      {converting && <Live every={6000} />}
      <div className="week-nav">
        {week > 1 ? <Link href={`/circle/week/${week - 1}`}>← Week {week - 1}</Link> : <span />}
        {week < current ? <Link href={`/circle/week/${week + 1}`}>Week {week + 1} →</Link> : <span />}
      </div>
      <section className="drop-card">
        <p className="eyebrow">
          Week {week}: {weekTitle(week)} · {rows.length} of {pl.members.length} answered
          {locked && <> · <Link href={`/circle/read/${week}`}>📰 The Read</Link></>}
        </p>
        <h1 className="drop-prompt">{prompt.body}</h1>
        {prompt.credit && <p className="drop-credit">This week&apos;s drop by {prompt.credit}</p>}
        {prompt.hint && <p className="drop-hint">{prompt.hint}</p>}
        {prompt.mode === "anon" && <p className="anon-note">🎭 Anonymous drop. Nobody in the Circle sees who wrote what.</p>}
        {guessing && !revealed && (
          <p className="anon-note">🎭 {prompt.mode === "owner" ? "Guess the Owner. Post yours, then guess whose is whose." : "Guess Who. Answer anonymously, then guess who wrote what."} Names come out when the week ends.</p>
        )}
        {guessing && revealed && (
          <p className="anon-note">
            🎭 Names are out. You got {right} of {myGuesses.size} right.
            {locked?.guesser && <> 🕵️ Best Guesser: <b>{name(locked.guesser.user_id)}</b>, {locked.guesser.right} of {locked.guesser.of}.</>}
          </p>
        )}
        {prompt.mode === "dare" && <p className="anon-note">🏁 Dare. Do it, then post what happened. Photo optional.</p>}
        {twoTruths && !lieRevealed && <p className="anon-note">🎭 Two Truths and a Lie. Names hidden. Vote on everyone&apos;s lie. Reveal when the week ends.</p>}
        {twoTruths && lieRevealed && (
          <p className="anon-note">
            🎭 Lies revealed. You caught {lieRight} of {myVotes.size}.
            {locked?.liar && <> 🤥 Best Liar: <b>{name(locked.liar.user_id)}</b>, fooled {locked.liar.fooled} of {locked.liar.of}.</>}
          </p>
        )}
        {captionUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={captionUrl} alt="" className="answer-photo" />
        )}
        {locked?.caption && (
          <p className="anon-note winner-note">
            💬 Caption Champ: <b>{name(locked.caption.user_id)}</b> &ldquo;{locked.caption.caption}&rdquo; · {locked.caption.reactions} reactions
          </p>
        )}
        {seatId && (
          <p className="anon-note">
            🔥 {seatId === pl.profile.id ? "You're in the hot seat. Answer in the replies, or don't." : `${spec!.kind === "hotseat" ? spec!.seatName : ""} is in the hot seat. Ask him one thing.`}
            {questions.length > 0 && <> Answered {seatAnswered} of {questions.length}.</>}
          </p>
        )}
        {spec?.kind === "rank" && locked?.rank && (
          <p className="anon-note winner-note">
            👑 {spec.category}: <b>{name(locked.rank.winner)}</b>
            {locked.rank.runner_up && <>, runner-up {name(locked.rank.runner_up)}</>}. {locked.rank.ranked} ranked. Final.
          </p>
        )}
        {spec?.kind === "ranknight" && !locked && (
          <p className="anon-note">🎖️ Rank Night. {answeredPlays.length} ballots in. Results lock {lockLabel}, and everybody in the Circle gets a title.</p>
        )}
        {spec?.kind === "ranknight" && locked?.superlatives && (
          <div className="rn-results">
            {locked.superlatives.titles[pl.profile.id] && (
              <p className="rn-mine">
                The Circle voted you: <b>{locked.superlatives.titles[pl.profile.id].category}</b>
                {locked.superlatives.titles[pl.profile.id].votes > 0 && <span className="fine"> · {locked.superlatives.titles[pl.profile.id].votes} {locked.superlatives.titles[pl.profile.id].votes === 1 ? "vote" : "votes"}</span>}
              </p>
            )}
            <ul className="rn-board">
              {locked.superlatives.winners.map((w) => (
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
          </div>
        )}
        {spec?.kind === "rank" && !locked && rankLive && (
          <p className="anon-note">
            🏆 Leading for {spec.category}: <b>{rankLive[0]}</b>
            {rankLive[1] && <>, then {rankLive[1]}</>}. {answeredPlays.length} ranked so far. Locks {lockLabel}.
          </p>
        )}
        {chain && (
          <p className="anon-note">
            ⛓️ {chainDone ? "The story is finished." : `Line ${chainLines + 1} of ${chainEnd + 1}. ${chainLines >= chainEnd ? "The next line is the ending." : "Stop mid-sentence. Whoever writes line " + (chainEnd + 1) + " lands the ending."}`}
          </p>
        )}
        {!mine && isPlay && spec && spec.kind !== "owner" && !chainDone && <PlayForm week={week} spec={spec} guys={guyList} meId={pl.profile.id} ending={chain && chainLines >= chainEnd} />}
        {!mine && spec?.kind === "owner" && <AnswerForm week={week} kind="photo" canPass={(passes ?? 0) < 1} />}
        {spec?.kind === "blinddate" && mine && <PlayForm week={week} spec={spec} myRow={mine.data} />}
        {!mine && !isPlay && spec?.kind !== "caption" && <AnswerForm week={week} kind={prompt.mode === "dare" ? "photo" : prompt.kind} canPass={(passes ?? 0) < 1} />}
        {mine?.passed && <p className="fine">You passed on this one.</p>}
      </section>

      {chain ? (
        <section className="answers">
          <div className="chain">
            <p className="eyebrow">The story so far · {chainLines} lines</p>
            <p className="chain-line opener">{spec!.kind === "chain" ? spec!.opener : ""}</p>
            {[...rows].filter((a) => !a.passed).sort((x, y) => x.created_at.localeCompare(y.created_at)).map((a) => (
              <p key={a.id} className={a.user_id === pl.profile.id ? "chain-line mine" : "chain-line"}>
                {(a.data?.line as string) ?? a.body} <span className="fine">· {byId.get(a.user_id)?.first_name}</span>
              </p>
            ))}
            {chainDone && <p className="fine">The end.</p>}
          </div>
          {chainDone && (
            <div className="read-aloud">
              <p className="eyebrow">🎙️ Read it aloud · {readings.length} {readings.length === 1 ? "reading" : "readings"}</p>
              <p className="fine">Read it out loud. Do the voices.</p>
              <ul className="readings">
                {readings.map((r) => (
                  <li key={r.id}>
                    <div className="answer-head">
                      <Avatar src={urlsForReaders.get(byId.get(r.user_id)?.photo_path ?? "")} name={name(r.user_id)} size={32} />
                      <GuyName pl={pl} m={byId.get(r.user_id)} />
                    </div>
                    {r.ready && readingUrlsAll.get(r.path) ? <Waveform src={readingUrlsAll.get(r.path)!} /> : <p className="converting">⏳ Converting. A minute, tops.</p>}
                    <FireReading id={r.id} count={r.reading_fires.length} mine={r.reading_fires.some((f) => f.user_id === pl.profile.id)} />
                  </li>
                ))}
              </ul>
              {!readings.some((r) => r.user_id === pl.profile.id) && <RecordReading week={week} />}
            </div>
          )}
        </section>
      ) : !mine ? (
        <section className="answers">
          <p className="locked-note">🔒 {others.length} {others.length === 1 ? "answer is" : "answers are"} blurred until you post yours.</p>
          <ul className="answer-list">
            {others.map((a) => {
              const m = byId.get(a.user_id);
              return (
                <li key={a.id} className="answer answer-locked">
                  <div className="answer-head">
                    <span className="avatar avatar-empty" style={{ width: 40, height: 40 }} />
                    <span className="guy-name">{anon || anonSurvey ? "Anonymous" : m?.first_name}</span>
                  </div>
                  <p className="blurred" aria-hidden="true">
                    {"something you'll want to read once you answer ".repeat(2)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="answers">
          {census && (
            <div className="census">
              <p className="eyebrow">
                Circle Census · {answeredPlays.length} answered{anonSurvey && " · anonymous"}
              </p>
              <ul>
                {census.map((c, i) => (
                  <li key={c.q}>
                    <span className="census-bar" style={{ width: `${c.pct}%` }} />
                    <span className="census-pct">{c.pct}%</span>
                    <span>
                      {c.q}
                      {florida && <span className="census-fl"> · Everyone {florida.pct[i]}%</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {florida && <p className="fine">Everyone: {florida.n} guys across every Circle.</p>}
              {anonSurvey && mine.data && <p className="fine">Your card: {compile(spec!, mine.data).score}. Only you see it.</p>}
            </div>
          )}
          {splits && (
            <div className="census">
              <p className="eyebrow">How the Circle split · {answeredPlays.length} answered</p>
              <ul className="splits">
                {splits.map((s) => (
                  <li key={s.a}>
                    <span className={s.left >= 50 ? "win" : ""}>
                      {s.a} {s.left}%
                    </span>
                    <span className="split-bar">
                      <span style={{ width: `${s.left}%` }} />
                    </span>
                    <span className={s.left < 50 ? "win" : ""}>
                      {100 - s.left}% {s.b}
                    </span>
                  </li>
                ))}
              </ul>
              {agree.length > 0 && (
                <p className="fine">
                  Most like you: {agree.map((g) => `${g.name} (${g.n} of ${spec!.kind === "thisorthat" ? spec!.pairs.length : 0})`).join(", ")}.
                </p>
              )}
            </div>
          )}
          {ownerDeck && (
            <OwnerDeck
              dropId={drop.id}
              cards={others.map((a) => ({ id: a.id, photo: (a.photo_path && urls.get(a.photo_path)) || null, body: a.body }))}
              guys={guyList.filter((g) => g.id !== pl.profile.id)}
              initial={Object.fromEntries(myGuesses)}
            />
          )}
          <ul className={samePose ? "answer-list answer-grid" : "answer-list"}>
            {(spec?.kind === "blinddate" || spec?.kind === "ranknight" || anonSurvey || ownerDeck ? [] : [...rows.filter((a) => a.user_id === pl.profile.id && !a.passed), ...others]).map((a) => {
              const m = byId.get(a.user_id);
              const isMine = a.user_id === pl.profile.id;
              const hideName = anon && !revealed && !lieRevealed;
              const f = twoTruths && (lieRevealed || isMine) && a.data ? fooled(a) : null;
              const seatReply = seatId && a.user_id !== seatId ? a.replies.find((r) => r.user_id === seatId) : null;
              return (
                <li key={a.id} className={[isMine ? "answer answer-mine" : "answer", a.hidden ? "answer-hidden" : ""].join(" ")}>
                  {a.hidden && <p className="fine">⚠️ Pulled after reports. Under review.</p>}
                  {a.held && !a.hidden && <span className="held-tag">⏳ Quick review before it posts.</span>}
                  <div className="answer-head">
                    {hideName ? (
                      <>
                        <span className="avatar anon-mask" style={{ width: 40, height: 40 }} aria-hidden="true">
                          🎭
                        </span>
                        <span className="guy-name">{isMine ? "You (only you know)" : "Anonymous"}</span>
                      </>
                    ) : (
                      <>
                        <Avatar src={m ? urls.get(m.photo_path) : undefined} name={m?.first_name ?? ""} size={40} />
                        <GuyName pl={pl} m={m} />
                        {!samePose && <span className="fine">{timeAgo(a.created_at)}</span>}
                      </>
                    )}
                    {locked?.top?.answer_id === a.id && <span className="pill-win">🔥 Answer of the week</span>}
                    {locked?.story?.answer_id === a.id && <span className="pill-win">📖 Best story</span>}
                  </div>
                  <Media a={a} />
                  {a.body && !samePose && <p className="answer-body">{a.body}</p>}
                  {a.data && spec?.kind === "madlibs" && <MadLib template={spec.template} words={a.data.words as string[]} />}
                  {a.data && spec && !["twotruths", "rank", "blinddate", "hotseat", "madlibs"].includes(spec.kind) && <PlayCard spec={spec} data={a.data} />}
                  {a.data && spec?.kind === "hotseat" && a.user_id !== seatId && (
                    <div className="hotseat-q">
                      <p className="answer-body">❓ {a.data.question as string}</p>
                      {seatReply ? (
                        <p className="hotseat-a">🔥 <b>{name(seatId)}:</b> {seatReply.body}</p>
                      ) : over ? (
                        <p className="hotseat-dodged">🙈 Dodged</p>
                      ) : (
                        <p className="fine">Waiting on him.</p>
                      )}
                    </div>
                  )}
                  {a.data && twoTruths && !lieRevealed && !isMine && (
                    <LieVote dropId={drop.id} answerId={a.id} statements={a.data.statements as string[]} current={myVotes.get(a.id) ?? null} />
                  )}
                  {a.data && twoTruths && (lieRevealed || isMine) && (
                    <>
                      <ol className="tt-vote">
                        {(a.data.statements as string[]).map((s, i) => (
                          <li key={i} className={i === (a.data!.lie as number) ? "tt-opt lie" : "tt-opt truth"}>
                            <span className="tt-num">{i + 1}</span> {s} {i === (a.data!.lie as number) && <b>the lie</b>}
                            {lieRevealed && myVotes.get(a.id) === i && !isMine && <span className="fine"> · your vote</span>}
                          </li>
                        ))}
                      </ol>
                      {f && f.of > 0 && (
                        <p className={f.fooled * 2 > f.of ? "fooled hot" : "fooled"}>
                          🤥 Fooled {f.fooled} of {f.of} {isMine && !lieRevealed ? "so far" : ""}
                        </p>
                      )}
                    </>
                  )}
                  {prompt.mode === "guesswho" && !revealed && !isMine && (
                    <GuessWho
                      dropId={drop.id}
                      answerId={a.id}
                      current={myGuesses.get(a.id) ?? ""}
                      guys={pl.members.filter((x) => x.id !== pl.profile.id).map((x) => ({ id: x.id, name: x.first_name }))}
                    />
                  )}
                  {guessing && revealed && !isMine && myGuesses.has(a.id) && (
                    <p className={myGuesses.get(a.id) === a.user_id ? "guess-result right" : "guess-result"}>
                      {myGuesses.get(a.id) === a.user_id ? "You called it." : `You guessed ${byId.get(myGuesses.get(a.id)!)?.first_name ?? "someone else"}.`}
                    </p>
                  )}
                  {spec?.kind === "madlibs" && !isMine && !locked && <StoryVote dropId={drop.id} answerId={a.id} mine={myStory === a.id} votes={storyVotes(a.id)} />}
                  {spec?.kind === "madlibs" && (isMine || locked) && storyVotes(a.id) > 0 && <p className="fine">📖 {storyVotes(a.id)} {storyVotes(a.id) === 1 ? "vote" : "votes"} for best story</p>}
                  <div className="answer-foot">
                    <Reactions answerId={a.id} reactions={a.reactions} meId={pl.profile.id} />
                    {!isMine && <ReportAnswer answerId={a.id} />}
                  </div>
                  {a.replies.length > 0 && !(seatId && a.user_id !== seatId) && (
                    <ul className="reply-list">
                      {[...a.replies]
                        .sort((x, y) => x.created_at.localeCompare(y.created_at))
                        .map((r) => (
                          <li key={r.id}>
                            <b>{byId.get(r.user_id)?.first_name ?? "Someone"}</b> {r.body}
                          </li>
                        ))}
                    </ul>
                  )}
                  {seatId && a.user_id !== seatId && a.replies.filter((r) => r.user_id !== seatId).length > 0 && (
                    <ul className="reply-list">
                      {a.replies.filter((r) => r.user_id !== seatId).map((r) => (
                        <li key={r.id}>
                          <b>{byId.get(r.user_id)?.first_name ?? "Someone"}</b> {r.body}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!samePose && <ReplyBox answerId={a.id} />}
                </li>
              );
            })}
          </ul>
          {others.length === 0 && !anonSurvey && spec?.kind !== "ranknight" && <p className="fine">You&apos;re first.</p>}
        </section>
      )}
      {week >= 2 && (
        <>
          <WriteDrop left={Math.max(0, 3 - myDrops)} />
          {(myBank ?? []).length > 0 && (
            <ul className="my-drops">
              {(myBank ?? []).map((b) => (
                <li key={b.id}>
                  <span className="fine">
                    {b.status === "approved" && b.times_used > 0
                      ? `✅ Ran in ${b.times_used} ${b.times_used === 1 ? "Circle" : "Circles"}`
                      : b.status === "approved"
                        ? "✅ Approved, waiting for its week"
                        : b.status === "retired"
                          ? "Retired"
                          : "⏳ With Daddy"}
                  </span>{" "}
                  &ldquo;{b.body}&rdquo;
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Shell>
  );
}

// A Mad Lib with the guy's words lit up.
function MadLib({ template, words }: { template: string; words: string[] }) {
  const parts = template.split(/(\{\d+\})/g);
  return (
    <p className="answer-body madlib">
      {parts.map((p, i) => {
        const m = p.match(/^\{(\d+)\}$/);
        return m ? (
          <mark key={i} className="madlib-word">
            {words[Number(m[1])] ?? ""}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </p>
  );
}

function PlayCard({ spec, data }: { spec: NonNullable<ReturnType<typeof promptOf>["spec"]>; data: Record<string, unknown> }) {
  const c = compile(spec, data);
  if (spec.kind === "thisorthat") {
    return (
      <ul className="chips">
        {c.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    );
  }
  if (!c.lines.length && !c.title) return null;
  return (
    <div className="playcard">
      {c.title && (
        <p className="playcard-title">
          {c.title} {c.score && <b>{c.score}</b>}
        </p>
      )}
      <ul>
        {c.lines.map((l, i) => (
          <li key={i} className={l.startsWith("✗") ? "dim" : ""}>
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
