import Link from "next/link";
import { Avatar } from "../../ui";

type Who = { id: string; name: string; photo?: string };

// Have You Ever, question by question: how many said yes, and who. Faces make
// it a conversation instead of a spreadsheet.
export function SurveyBoard({
  questions,
  yes,
  answered,
  everyone,
  meId,
}: {
  questions: string[];
  yes: Who[][]; // per question, who said yes
  answered: number;
  everyone?: { n: number; pct: number[] } | null;
  meId: string;
}) {
  const order = questions.map((q, i) => ({ q, i, n: yes[i].length })).sort((a, b) => a.n - b.n);
  return (
    <div className="board">
      <p className="eyebrow">Who&apos;s done what · {answered} answered</p>
      <ul className="board-list">
        {order.map(({ q, i, n }) => {
          const pct = Math.round((100 * n) / Math.max(1, answered));
          const meToo = yes[i].some((w) => w.id === meId);
          const others = yes[i].filter((w) => w.id !== meId);
          return (
            <li key={i} className={meToo ? "board-row board-mine" : "board-row"}>
              <span className="census-bar" style={{ width: `${pct}%` }} />
              <div className="board-top">
                <span className="board-q">{q}</span>
                <span className="board-pct">{n === 0 ? "Nobody" : answered >= 3 ? `${pct}%` : `${n}`}</span>
              </div>
              {(meToo || others.length > 0) && (
                <div className="board-who">
                  {meToo && <span className="board-you">You</span>}
                  {others.slice(0, 8).map((w) => (
                    <Link key={w.id} href={`/circle/guy/${w.id}`} className="board-face" title={w.name}>
                      <Avatar src={w.photo} name={w.name} size={26} />
                      <span>{w.name}</span>
                    </Link>
                  ))}
                  {others.length > 8 && <span className="fine">+{others.length - 8}</span>}
                </div>
              )}
              {n === 1 && meToo && <p className="board-note">Only you. Bold.</p>}
              {n === 1 && !meToo && others[0] && <p className="board-note">Only {others[0].name}. Ask him about it.</p>}
              {everyone && <p className="board-note">Everyone on Homosocial: {everyone.pct[i]}%</p>}
            </li>
          );
        })}
      </ul>
      {everyone && <p className="fine">Everyone: {everyone.n} guys across every Circle.</p>}
    </div>
  );
}

// Speed Round, question by question: everyone's answer side by side, and who
// said the same thing as you.
export function SpeedBoard({ questions, answers, meId }: { questions: string[]; answers: (Who & { list: string[] })[]; meId: string }) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  return (
    <div className="board">
      <p className="eyebrow">Everyone&apos;s answers · {answers.length} played</p>
      <ul className="board-list">
        {questions.map((q, i) => {
          const mine = answers.find((a) => a.id === meId)?.list[i]?.trim() ?? "";
          const said = answers
            .map((a) => ({ ...a, text: a.list[i]?.trim() ?? "" }))
            .filter((a) => a.text)
            .sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : 0));
          const twins = mine ? said.filter((a) => a.id !== meId && norm(a.text) === norm(mine)) : [];
          return (
            <li key={i} className="board-row">
              <p className="board-q">{q}</p>
              {twins.length > 0 && (
                <p className="board-twin">
                  🤝 You and {twins.map((t) => t.name).join(", ")} both said &ldquo;{mine}&rdquo;
                </p>
              )}
              <ul className="speed-answers">
                {said.map((a) => (
                  <li key={a.id} className={a.id === meId ? "mine" : ""}>
                    <Avatar src={a.photo} name={a.name} size={24} />
                    <b>{a.id === meId ? "You" : a.name}</b>
                    <span>{a.text}</span>
                  </li>
                ))}
                {said.length === 0 && <li className="fine">Everyone ran out of time.</li>}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
