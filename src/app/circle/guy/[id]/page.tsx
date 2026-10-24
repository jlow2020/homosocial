import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { badgesFor } from "@/lib/game/standings";
import { BADGES } from "@/lib/game/lock";
import { UUID } from "@/lib/admin";
import { ageFrom } from "@/lib/season";
import { promptOf, type Drop } from "@/lib/game/drops";
import { loadExtras, greatestHit, ownWords, yearbook  , youTwo } from "@/lib/profile/data";
import { TAG_BY_SLUG } from "@/lib/profile/catalog";
import { downLabel } from "@/lib/profile/downfor";
import StaffBadge from "@/components/StaffBadge";
import FounderBadge from "@/components/FounderBadge";
import Waveform from "@/components/Waveform";
import MemberActions from "../../MemberActions";
import { startDm } from "../../game-actions";
import { Shell, weekTitle } from "../../ui";
import Gallery from "./Gallery";

export const dynamic = "force-dynamic";

export default async function Guy({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const pl = await loadPlayer({ needSeat: true });
  const self = id === pl.profile.id;
  const m = pl.members.find((x) => x.id === id);
  if (!m) notFound();
  const db = pl.db;

  const [his, mine, badges, words, book] = await Promise.all([
    loadExtras(db, id),
    self ? Promise.resolve(null) : loadExtras(db, pl.profile.id),
    badgesFor(db, id),
    ownWords(db, id),
    yearbook(db, id),
  ]);
  const [hit, together] = await Promise.all([greatestHit(db, id, his.pinned), self || !mine ? Promise.resolve([] as string[]) : youTwo(db, pl.profile.id, id, mine, his, m.first_name)]);

  // His answers this Season, but only on drops you've answered too.
  const { data: drops } = await db
    .from("drops")
    .select("id, circle_id, season_no, week, prompt_id, body, mode, spec, created_at")
    .eq("circle_id", pl.circle.id)
    .eq("season_no", pl.circle.season_no)
    .order("week");
  const dropIds = (drops ?? []).map((d) => d.id);
  const { data: answers } = dropIds.length
    ? await db.from("answers").select("drop_id, user_id, body, photo_path, passed, held, hidden").in("drop_id", dropIds).in("user_id", [id, pl.profile.id])
    : { data: [] };
  const mineDone = new Set((answers ?? []).filter((a) => a.user_id === pl.profile.id).map((a) => a.drop_id));
  const hisAnswers = (answers ?? []).filter((a) => a.user_id === id && !a.passed && (self || (!a.held && !a.hidden)));
  const { data: thread } = self
    ? { data: null }
    : await db.from("dm_threads").select("id").eq("a", [id, pl.profile.id].sort()[0]).eq("b", [id, pl.profile.id].sort()[1]).maybeSingle();
  const urls = await photoUrls(db, [m.photo_path, ...hisAnswers.map((a) => a.photo_path)]);

  const shots = [
    ...(urls.get(m.photo_path) ? [{ url: urls.get(m.photo_path)!, theme: null, veiled: false }] : []),
    ...his.photos.filter((p) => p.url).map((p) => ({ url: p.url!, theme: p.theme, veiled: p.veiled })),
  ];
  const b = his.basics;
  const facts = [b.work, b.hometown && `from ${b.hometown}`, b.zodiac, b.show_relationship || self ? b.relationship : null].filter(Boolean) as string[];
  const sharedTags = new Set(mine?.interests ?? []);
  const sharedDown = new Set(mine?.down ?? []);
  const tagLabel = (s: string) => TAG_BY_SLUG.get(s)?.label ?? s.replace(/^c-/, "").replace(/-/g, " ");
  const seasons = new Set(book.map((p) => `${p.circle}:${p.season}`)).size;

  return (
    <Shell pl={pl}>
      {self && (
        <div className="self-bar">
          <span>This is how your Circle sees you.</span>
          <Link href="/profile" className="btn btn-small btn-pink">
            Edit
          </Link>
        </div>
      )}
      <section className="guy-top">
        <Gallery shots={shots} name={m.first_name} self={self} />
        <div className="guy-id">
          <h1 className="game-h1">
            {m.first_name}, {ageFrom(m.birthdate)}
          </h1>
          <p className="guy-sub">
            {b.pronouns && <span className="pron">{b.pronouns}</span>}
            {pl.titles.get(m.id) && <StaffBadge title={pl.titles.get(m.id)!} />}
            {m.founder_no && <FounderBadge no={m.founder_no} />}
          </p>
          {facts.length > 0 && <p className="guy-facts">{facts.join(" · ")}</p>}
          {his.voiceUrl && (
            <div className="guy-voice">
              <span className="eyebrow">His hello</span>
              <Waveform src={his.voiceUrl} />
            </div>
          )}
          {!self && (
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
          )}
        </div>
      </section>

      <div className="guy-sections">
        {together.length > 0 && (
          <section className="g-card g-two">
            <p className="eyebrow">You two</p>
            <ul>
              {together.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}

        {hit && (
          <section className="g-card g-hit">
            <p className="eyebrow">🔥 Greatest Hit · {hit.fires} reactions</p>
            <p className="g-hit-prompt">{hit.prompt}</p>
            <p className="g-quote">&ldquo;{hit.body}&rdquo;</p>
            <p className="fine">
              Season {hit.season}, Week {hit.week}
            </p>
          </section>
        )}

        {his.answers.map((a) => (
          <section key={a.prompt_id} className="g-card g-prompt">
            <p className="g-prompt-q">{a.prompt}</p>
            <p className="g-quote">{a.body}</p>
          </section>
        ))}

        {(his.interests.length > 0 || his.down.length > 0) && (
          <section className="g-card">
            {his.interests.length > 0 && (
              <>
                <p className="eyebrow">Into</p>
                <ul className="g-tags">
                  {his.interests.map((t) => (
                    <li key={t} className={sharedTags.has(t) ? "shared" : ""}>
                      {tagLabel(t)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {his.down.length > 0 && (
              <>
                <p className="eyebrow">Down for</p>
                <ul className="g-tags down">
                  {his.down.map((t) => (
                    <li key={t} className={sharedDown.has(t) ? "shared" : ""}>
                      {downLabel(t)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {(b.song || b.spot) && (
          <section className="g-card g-pair">
            {b.song && (
              <div>
                <p className="eyebrow">🎧 On repeat</p>
                <p className="g-big">{b.song}</p>
              </div>
            )}
            {b.spot && (
              <div>
                <p className="eyebrow">📍 His spot</p>
                <p className="g-big">{b.spot}</p>
              </div>
            )}
          </section>
        )}

        {(words.picks.length > 0 || words.speed.length > 0) && (
          <section className="g-card">
            <p className="eyebrow">In his own words</p>
            {words.picks.length > 0 && (
              <ul className="g-tags picks">
                {words.picks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            {words.speed.length > 0 && (
              <dl className="g-speed">
                {words.speed.map((s) => (
                  <div key={s.q}>
                    <dt>{s.q}</dt>
                    <dd>{s.a}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        {(badges.length > 0 || m.founder_no || seasons > 0) && (
          <section className="g-card">
            <p className="eyebrow">Trophy shelf</p>
            <div className="g-shelf">
              {m.founder_no && (
                <div className="trophy gold">
                  <span className="trophy-big">#{m.founder_no}</span>
                  <span>Founder</span>
                </div>
              )}
              {seasons > 0 && (
                <div className="trophy">
                  <span className="trophy-big">{seasons}</span>
                  <span>{seasons === 1 ? "Season" : "Seasons"} played</span>
                </div>
              )}
              {badges.slice(0, 10).map((x, i) => (
                <div key={i} className="trophy" title={BADGES[x.badge]?.blurb}>
                  <span className="trophy-big">{BADGES[x.badge]?.emoji ?? "🏅"}</span>
                  <span>{x.label}</span>
                  <span className="fine">
                    S{x.season_no}
                    {x.week < 9 ? ` W${x.week}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {book.length > 0 && (
          <section className="g-card">
            <p className="eyebrow">Yearbook</p>
            <ol className="yearbook">
              {book.map((p) => (
                <li key={`${p.circle}:${p.season}`}>
                  <p className="yb-head">
                    Season {p.season} <span className="fine">· Circle {p.circle}{p.region ? `, ${p.region}` : ""}</span>
                  </p>
                  {p.best && (
                    <p className="g-quote small">
                      &ldquo;{p.best.body}&rdquo; <span className="fine">{p.best.fires} 🔥</span>
                    </p>
                  )}
                  <p className="fine">
                    {p.answered} drops answered
                    {p.badges.length > 0 && ` · ${p.badges.map((x) => `${x.emoji} ${x.label}`).join(" · ")}`}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {!self && his.interests.length === 0 && his.answers.length === 0 && !hit && (
          <section className="g-card">
            <p className="fine">Into {m.interests}. &ldquo;{m.hot_take}&rdquo;</p>
          </section>
        )}
      </div>

      <section style={{ marginTop: 32 }}>
        <h2 className="admin-h3">{self ? "Your Season so far" : "His Season so far"}</h2>
        <ul className="answer-list">
          {((drops ?? []) as Drop[]).map((d) => {
            const a = hisAnswers.find((x) => x.drop_id === d.id);
            // Anonymous drops never show up on anyone's page.
            if (!a || promptOf(d).anon) return null;
            const unlocked = self || mineDone.has(d.id);
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
      </section>
    </Shell>
  );
}
