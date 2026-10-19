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
import { compile } from "@/lib/game/playcheck";
import { PLAY_MODES } from "@/lib/game/plays";

export const dynamic = "force-dynamic";

type AnswerRow = {
  id: string;
  user_id: string;
  body: string | null;
  photo_path: string | null;
  media_type: "photo" | "video" | null;
  data: Record<string, unknown> | null;
  passed: boolean;
  created_at: string;
  reactions: { user_id: string; emoji: string }[];
  replies: { id: string; user_id: string; body: string; created_at: string }[];
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
  const { data } = await db
    .from("answers")
    .select("id, user_id, body, photo_path, media_type, data, passed, created_at, reactions(user_id, emoji), replies(id, user_id, body, created_at)")
    .eq("drop_id", drop.id)
    .order("created_at", { ascending: true });
  const memberIds = new Set(pl.members.map((m) => m.id));
  const rows = ((data ?? []) as AnswerRow[]).filter((a) => memberIds.has(a.user_id));
  const mine = rows.find((a) => a.user_id === pl.profile.id);
  const anon = !!prompt.anon;
  // Anonymous drops: no names, no faces, and no posting order to give anyone away.
  const others = rows
    .filter((a) => a.user_id !== pl.profile.id && !a.passed)
    .sort((x, y) => (anon ? x.id.localeCompare(y.id) : 0));
  const byId = new Map(pl.members.map((m) => [m.id, m]));

  // One Pass per Season.
  const { data: seasonDrops } = await db.from("drops").select("id").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const { count: passes } = await db
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", pl.profile.id)
    .eq("passed", true)
    .in("drop_id", (seasonDrops ?? []).map((d) => d.id));

  // Guess Who: the names come out when the week is over.
  const guessing = prompt.mode === "guesswho";
  const revealed = guessing && (week < current || clock.phase === "revealed");
  const { data: guessRows } = guessing ? await db.from("guesses").select("guesser, answer_id, guessed").eq("drop_id", drop.id) : { data: [] };
  const myGuesses = new Map((guessRows ?? []).filter((g) => g.guesser === pl.profile.id).map((g) => [g.answer_id as string, g.guessed as string]));
  const right = revealed ? [...myGuesses].filter(([aid, who]) => rows.find((a) => a.id === aid)?.user_id === who).length : 0;
  const { count: myDrops } = await db
    .from("prompt_bank")
    .select("id", { count: "exact", head: true })
    .eq("author_id", pl.profile.id)
    .gte("created_at", new Date(Date.now() - 60 * 864e5).toISOString());

  // Two Truths: votes, and the reveal when the week ends.
  const isPlay = (PLAY_MODES as string[]).includes(prompt.mode);
  const twoTruths = prompt.mode === "twotruths";
  const lieRevealed = twoTruths && (week < current || clock.phase === "revealed");
  const { data: voteRows } = twoTruths ? await db.from("votes").select("voter, answer_id, choice").eq("drop_id", drop.id) : { data: [] };
  const myVotes = new Map((voteRows ?? []).filter((v) => v.voter === pl.profile.id).map((v) => [v.answer_id as string, v.choice as number]));
  const lieRight = lieRevealed ? [...myVotes].filter(([aid, c]) => (rows.find((a) => a.id === aid)?.data?.lie as number | undefined) === c).length : 0;

  // Circle Census: the totals, once he's answered.
  const spec = prompt.spec;
  const answeredPlays = rows.filter((a) => !a.passed && a.data);
  const census =
    mine && spec?.kind === "survey" && spec.census && answeredPlays.length >= 3
      ? spec.questions.map((q, i) => ({ q, pct: Math.round((100 * answeredPlays.filter((a) => (a.data!.answers as boolean[])[i]).length) / answeredPlays.length) }))
      : null;
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

  const clipPaths = rows.filter((a) => a.media_type === "video" && a.photo_path).map((a) => a.photo_path as string);
  const clips = mine && clipPaths.length
    ? new Map(((await db.storage.from("clips").createSignedUrls(clipPaths, 3600)).data ?? []).map((x) => [x.path as string, x.signedUrl as string]))
    : new Map<string, string>();
  const urls = mine
    ? await photoUrls(db, [...pl.members.map((m) => m.photo_path), ...rows.filter((a) => a.media_type !== "video").map((a) => a.photo_path)])
    : await photoUrls(db, [pl.profile.photo_path]);

  return (
    <Shell pl={pl}>
      <div className="week-nav">
        {week > 1 ? <Link href={`/circle/week/${week - 1}`}>← Week {week - 1}</Link> : <span />}
        {week < current ? <Link href={`/circle/week/${week + 1}`}>Week {week + 1} →</Link> : <span />}
      </div>
      <section className="drop-card">
        <p className="eyebrow">
          Week {week}: {weekTitle(week)} · {rows.length} of {pl.members.length} answered
        </p>
        <h1 className="drop-prompt">{prompt.body}</h1>
        {prompt.credit && <p className="drop-credit">This week&apos;s drop by {prompt.credit}</p>}
        {prompt.hint && <p className="drop-hint">{prompt.hint}</p>}
        {prompt.mode === "anon" && <p className="anon-note">🎭 Anonymous drop. Nobody in the Circle sees who wrote what.</p>}
        {guessing && !revealed && <p className="anon-note">🎭 Guess Who. Answer anonymously, then guess who wrote what. Names come out when the week ends.</p>}
        {guessing && revealed && (
          <p className="anon-note">
            🎭 Names are out. You got {right} of {myGuesses.size} right.
          </p>
        )}
        {prompt.mode === "dare" && <p className="anon-note">🏁 Dare. Do it, then post what happened. Photo optional.</p>}
        {twoTruths && !lieRevealed && <p className="anon-note">🎭 Two Truths and a Lie. Names hidden. Vote on everyone&apos;s lie. Reveal when the week ends.</p>}
        {twoTruths && lieRevealed && (
          <p className="anon-note">
            🎭 Lies revealed. You caught {lieRight} of {myVotes.size}.
          </p>
        )}
        {!mine && isPlay && spec && <PlayForm week={week} spec={spec} />}
        {!mine && !isPlay && <AnswerForm week={week} kind={prompt.mode === "dare" ? "photo" : prompt.kind} canPass={(passes ?? 0) < 1} />}
        {mine?.passed && <p className="fine">You used your Pass on this one. Everyone&apos;s answers are unlocked.</p>}
      </section>

      {!mine ? (
        <section className="answers">
          <p className="locked-note">🔒 {others.length} {others.length === 1 ? "answer is" : "answers are"} blurred until you post yours.</p>
          <ul className="answer-list">
            {others.map((a) => {
              const m = byId.get(a.user_id);
              return (
                <li key={a.id} className="answer answer-locked">
                  <div className="answer-head">
                    <span className="avatar avatar-empty" style={{ width: 40, height: 40 }} />
                    <span className="guy-name">{anon ? "Anonymous" : m?.first_name}</span>
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
              <p className="eyebrow">Circle Census · {answeredPlays.length} answered</p>
              <ul>
                {census.map((c) => (
                  <li key={c.q}>
                    <span className="census-bar" style={{ width: `${c.pct}%` }} />
                    <span className="census-pct">{c.pct}%</span>
                    <span>{c.q}</span>
                  </li>
                ))}
              </ul>
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
          <ul className="answer-list">
            {[...rows.filter((a) => a.user_id === pl.profile.id && !a.passed), ...others].map((a) => {
              const m = byId.get(a.user_id);
              return (
                <li key={a.id} className={a.user_id === pl.profile.id ? "answer answer-mine" : "answer"}>
                  <div className="answer-head">
                    {(anon && !revealed && !lieRevealed) ? (
                      <>
                        <span className="avatar anon-mask" style={{ width: 40, height: 40 }} aria-hidden="true">
                          🎭
                        </span>
                        <span className="guy-name">{a.user_id === pl.profile.id ? "You (only you know)" : "Anonymous"}</span>
                      </>
                    ) : (
                      <>
                        <Avatar src={m ? urls.get(m.photo_path) : undefined} name={m?.first_name ?? ""} size={40} />
                        <GuyName pl={pl} m={m} />
                        <span className="fine">{timeAgo(a.created_at)}</span>
                      </>
                    )}
                  </div>
                  {a.photo_path && urls.get(a.photo_path) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls.get(a.photo_path)} alt="" className="answer-photo" />
                  )}
                  {a.body && <p className="answer-body">{a.body}</p>}
                  {a.media_type === "video" && a.photo_path && clips.get(a.photo_path) && (
                    <video src={clips.get(a.photo_path)} controls playsInline preload="metadata" className="answer-photo" />
                  )}
                  {a.data && spec && spec.kind !== "twotruths" && <PlayCard spec={spec} data={a.data} />}
                  {a.data && twoTruths && !lieRevealed && a.user_id !== pl.profile.id && (
                    <LieVote dropId={drop.id} answerId={a.id} statements={a.data.statements as string[]} current={myVotes.get(a.id) ?? null} />
                  )}
                  {a.data && twoTruths && (lieRevealed || a.user_id === pl.profile.id) && (
                    <ol className="tt-vote">
                      {(a.data.statements as string[]).map((s, i) => (
                        <li key={i} className={i === (a.data!.lie as number) ? "tt-opt lie" : "tt-opt truth"}>
                          <span className="tt-num">{i + 1}</span> {s} {i === (a.data!.lie as number) && <b>the lie</b>}
                          {lieRevealed && myVotes.get(a.id) === i && a.user_id !== pl.profile.id && <span className="fine"> · your vote</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                  {guessing && !revealed && a.user_id !== pl.profile.id && (
                    <GuessWho
                      dropId={drop.id}
                      answerId={a.id}
                      current={myGuesses.get(a.id) ?? ""}
                      guys={pl.members.filter((x) => x.id !== pl.profile.id).map((x) => ({ id: x.id, name: x.first_name }))}
                    />
                  )}
                  {guessing && revealed && a.user_id !== pl.profile.id && myGuesses.has(a.id) && (
                    <p className={myGuesses.get(a.id) === a.user_id ? "guess-result right" : "guess-result"}>
                      {myGuesses.get(a.id) === a.user_id ? "You called it." : `You guessed ${byId.get(myGuesses.get(a.id)!)?.first_name ?? "someone else"}.`}
                    </p>
                  )}
                  <Reactions answerId={a.id} reactions={a.reactions} meId={pl.profile.id} />
                  {a.replies.length > 0 && (
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
                  <ReplyBox answerId={a.id} />
                </li>
              );
            })}
          </ul>
          {others.length === 0 && <p className="fine">You&apos;re first. Everyone else is still thinking.</p>}
        </section>
      )}
      {week >= 2 && <WriteDrop left={Math.max(0, 3 - (myDrops ?? 0))} />}
    </Shell>
  );
}

function PlayCard({ spec, data }: { spec: NonNullable<ReturnType<typeof promptOf>["spec"]>; data: Record<string, unknown> }) {
  const c = compile(spec, data);
  if (spec.kind === "madlibs") return <p className="answer-body madlib">{c.lines[0]}</p>;
  if (spec.kind === "thisorthat") {
    return (
      <ul className="chips">
        {c.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    );
  }
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

