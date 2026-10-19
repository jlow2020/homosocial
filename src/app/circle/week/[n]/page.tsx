import Link from "next/link";
import { redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { ensureDrop, promptOf } from "@/lib/game/drops";
import { Avatar, GuyName, Shell, timeAgo, weekTitle } from "../../ui";
import AnswerForm from "./AnswerForm";
import Reactions from "./Reactions";
import ReplyBox from "./ReplyBox";

export const dynamic = "force-dynamic";

type AnswerRow = {
  id: string;
  user_id: string;
  body: string | null;
  photo_path: string | null;
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
    .select("id, user_id, body, photo_path, passed, created_at, reactions(user_id, emoji), replies(id, user_id, body, created_at)")
    .eq("drop_id", drop.id)
    .order("created_at", { ascending: true });
  const memberIds = new Set(pl.members.map((m) => m.id));
  const rows = ((data ?? []) as AnswerRow[]).filter((a) => memberIds.has(a.user_id));
  const mine = rows.find((a) => a.user_id === pl.profile.id);
  const others = rows.filter((a) => a.user_id !== pl.profile.id && !a.passed);
  const byId = new Map(pl.members.map((m) => [m.id, m]));

  // One Pass per Season.
  const { data: seasonDrops } = await db.from("drops").select("id").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const { count: passes } = await db
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", pl.profile.id)
    .eq("passed", true)
    .in("drop_id", (seasonDrops ?? []).map((d) => d.id));

  const urls = mine
    ? await photoUrls(db, [...pl.members.map((m) => m.photo_path), ...rows.map((a) => a.photo_path)])
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
        {prompt.hint && <p className="drop-hint">{prompt.hint}</p>}
        {!mine && <AnswerForm week={week} kind={prompt.kind} canPass={(passes ?? 0) < 1} />}
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
                    <span className="guy-name">{m?.first_name}</span>
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
          <ul className="answer-list">
            {[...rows.filter((a) => a.user_id === pl.profile.id && !a.passed), ...others].map((a) => {
              const m = byId.get(a.user_id);
              return (
                <li key={a.id} className={a.user_id === pl.profile.id ? "answer answer-mine" : "answer"}>
                  <div className="answer-head">
                    <Avatar src={m ? urls.get(m.photo_path) : undefined} name={m?.first_name ?? ""} size={40} />
                    <GuyName pl={pl} m={m} />
                    <span className="fine">{timeAgo(a.created_at)}</span>
                  </div>
                  {a.photo_path && urls.get(a.photo_path) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls.get(a.photo_path)} alt="" className="answer-photo" />
                  )}
                  {a.body && <p className="answer-body">{a.body}</p>}
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
    </Shell>
  );
}
