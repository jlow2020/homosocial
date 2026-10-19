import { redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { etLabel, untilLabel } from "@/lib/game/clock";
import { openChat } from "../game-actions";
import { Avatar, GuyName, Shell } from "../ui";
import PicksForm from "./PicksForm";
import { chemistryFor } from "@/lib/game/chemistry";

export const dynamic = "force-dynamic";

export default async function Finale() {
  const pl = await loadPlayer({ needSeat: true });
  const { db, circle, clock } = pl;
  const me = pl.profile.id;
  const week = clock.phase === "season" ? clock.week : clock.phase === "revealed" ? 9 : 0;
  if (week < 8) redirect("/circle");
  const base = { circle_id: circle.id, season_no: circle.season_no };
  const byId = new Map(pl.members.map((m) => [m.id, m]));
  const urls = await photoUrls(db, pl.members.map((m) => m.photo_path));
  const dating = pl.profile.looking_for === "friends_dating";

  const [{ data: picks }, { data: setups }, { data: stays }] = await Promise.all([
    db.from("picks").select("from_id, to_id, kind").match(base),
    db.from("setups").select("from_id, a, b").match(base),
    db.from("stay_choices").select("user_id, choice").match(base),
  ]);
  const myPicks = (picks ?? []).filter((p) => p.from_id === me);
  const mySetups = (setups ?? []).filter((s) => s.from_id === me);
  const myStay = (stays ?? []).find((s) => s.user_id === me)?.choice as "stay" | "mix" | undefined;

  if (clock.phase === "season") {
    const chem = await chemistryFor(db, circle, me, pl.members);
    const nm = (id: string) => byId.get(id)?.first_name ?? "Someone";
    const lines: { emoji: string; text: React.ReactNode }[] = [];
    if (chem.agreed) lines.push({ emoji: "⚖️", text: <><b>{nm(chem.agreed.id)}</b> picked the same side as you {chem.agreed.n} of {chem.agreed.of} times.</> });
    if (chem.dmd) lines.push({ emoji: "💬", text: <>You and <b>{nm(chem.dmd.id)}</b> have {chem.dmd.n} messages between you. The most of anyone.</> });
    if (chem.reactedToYou) lines.push({ emoji: "🔥", text: <><b>{nm(chem.reactedToYou.id)}</b> reacted to your answers {chem.reactedToYou.n} times. More than anyone.</> });
    if (chem.youReacted && chem.youReacted.id !== chem.reactedToYou?.id) lines.push({ emoji: "👀", text: <>You reacted to <b>{nm(chem.youReacted.id)}</b> the most. {chem.youReacted.n} times. Just saying.</> });
    if (chem.guessedYou) lines.push({ emoji: "🕵️", text: <><b>{nm(chem.guessedYou.id)}</b> clocked your anonymous answers {chem.guessedYou.n === 1 ? "once" : `${chem.guessedYou.n} times`}. He reads you.</> });
    if (chem.datesWith?.length) lines.push({ emoji: "💘", text: <>Your blind date{chem.datesWith.length > 1 ? "s" : ""}: <b>{chem.datesWith.map(nm).join(", ")}</b>.</> });
    return (
      <Shell pl={pl}>
        <div className="finale-head">
          <h1 className="game-h1">Make your picks</h1>
          <p className="game-lede">
            Private. Nobody ever sees who you picked, or who didn&apos;t pick them. At the Finale, only picks that go both
            ways get revealed.
          </p>
          <p className="fine">
            Picks lock at the Finale: {clock.testMode ? "whenever Daddy hits the star" : `${etLabel(clock.finaleAt)} (${untilLabel(clock.finaleAt)})`}.
          </p>
        </div>
        {lines.length > 0 && (
          <section className="chem">
            <p className="eyebrow">Your chemistry card · only you see this</p>
            <ul>
              {lines.map((l, i) => (
                <li key={i}>
                  <span className="chem-emoji">{l.emoji}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <PicksForm
          dating={dating}
          guys={pl.members
            .filter((m) => m.id !== me)
            .map((m) => ({ id: m.id, name: m.first_name, photo: urls.get(m.photo_path) ?? null }))}
          initial={{
            friend: myPicks.filter((p) => p.kind === "friend").map((p) => p.to_id),
            date: myPicks.filter((p) => p.kind === "date").map((p) => p.to_id),
            setups: mySetups.map((s) => [s.a, s.b]),
            stay: myStay ?? null,
          }}
        />
      </Shell>
    );
  }

  // Revealed.
  const pickedBy = (kind: string) => new Set((picks ?? []).filter((p) => p.kind === kind && p.to_id === me).map((p) => p.from_id));
  const iPicked = (kind: string) => new Set(myPicks.filter((p) => p.kind === kind).map((p) => p.to_id));
  const friendMutuals = [...iPicked("friend")].filter((id) => pickedBy("friend").has(id) && byId.has(id));
  const dateMutuals = dating ? [...iPicked("date")].filter((id) => pickedBy("date").has(id) && byId.has(id)) : [];

  const pairCount = new Map<string, Set<string>>();
  for (const s of setups ?? []) {
    const k = `${s.a}:${s.b}`;
    if (!pairCount.has(k)) pairCount.set(k, new Set());
    pairCount.get(k)!.add(s.from_id);
  }
  const setupsForMe = [...pairCount.entries()]
    .filter(([k, who]) => who.size >= 2 && k.split(":").includes(me))
    .map(([k, who]) => ({ other: k.split(":").find((x) => x !== me)!, count: who.size }))
    .filter((s) => byId.has(s.other));

  const stayed = (stays ?? []).filter((s) => s.choice === "stay").length;
  const total = pl.members.length;

  const card = (id: string, line: string, tone: string) => {
    const m = byId.get(id)!;
    return (
      <li key={`${tone}-${id}`} className={`mutual mutual-${tone}`}>
        <Avatar src={urls.get(m.photo_path)} name={m.first_name} size={64} />
        <div className="mutual-body">
          <GuyName pl={pl} m={m} />
          <p>{line}</p>
        </div>
        <form action={openChat.bind(null, id)}>
          <button className="btn btn-pink btn-small">Open chat</button>
        </form>
      </li>
    );
  };

  const nothing = !friendMutuals.length && !dateMutuals.length && !setupsForMe.length;

  return (
    <Shell pl={pl}>
      <div className="finale-head reveal">
        <p className="eyebrow">The Finale · Season {circle.season_no}</p>
        <h1 className="game-h1">The lights are up.</h1>
      </div>

      {dateMutuals.length > 0 && (
        <section className="reveal-block">
          <h2 className="reveal-h">💘 You picked each other for a date</h2>
          <ul className="mutual-list">{dateMutuals.map((id) => card(id, "You both said date. Don't overthink it.", "date"))}</ul>
        </section>
      )}

      {friendMutuals.length > 0 && (
        <section className="reveal-block">
          <h2 className="reveal-h">🤝 You picked each other as friends</h2>
          <ul className="mutual-list">{friendMutuals.map((id) => card(id, "It went both ways. He's yours now.", "friend"))}</ul>
        </section>
      )}

      {setupsForMe.length > 0 && (
        <section className="reveal-block">
          <h2 className="reveal-h">👀 The Circle thinks...</h2>
          <ul className="mutual-list">
            {setupsForMe.map((s) =>
              card(s.other, `${s.count} guys in your Circle think you and ${byId.get(s.other)!.first_name} should get coffee.`, "setup")
            )}
          </ul>
        </section>
      )}

      {nothing && (
        <section className="reveal-block">
          <h2 className="reveal-h">No mutuals this time.</h2>
          <p className="game-lede">
            It happens, and nobody else can see it. You still know every guy in this Circle, and the next Season starts
            right away with a fresh shot.
          </p>
        </section>
      )}

      <section className="mini-card" style={{ marginTop: 28 }}>
        <h3>What&apos;s next</h3>
        <p>
          {stayed} of {total} picked Stay. You picked <b>{myStay === "mix" ? "Mix me in" : myStay === "stay" ? "Stay" : "nothing, so you're staying"}</b>.
          The next Season starts right away. Every mutual carries over.
        </p>
      </section>
    </Shell>
  );
}
