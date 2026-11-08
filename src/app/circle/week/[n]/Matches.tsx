import Link from "next/link";
import { Avatar } from "../../ui";

// Results as matches, for any play where everyone answers the same questions
// (This or That, Have You Ever): who's most like you, what you have in common
// (rarest first, since those say the most), and a tap for every answer side by
// side plus his profile.

export type MatchItem = {
  q?: string; // the question, when there is one (surveys)
  options: string[]; // what each choice reads as
  chip: (string | null)[]; // what to show when you both chose it; null = not worth a chip
};
export type MatchGuy = { id: string; name: string; photo?: string; picks: number[] };

export default function Matches({ items, mine, guys, split = false, sharedLabel = "You both picked" }: { items: MatchItem[]; mine: number[]; guys: MatchGuy[]; split?: boolean; sharedLabel?: string }) {
  const everyone = [mine, ...guys.map((g) => g.picks)];
  const chose = (i: number, c: number) => everyone.filter((p) => p[i] === c).length;
  const rarity = (i: number) => chose(i, mine[i]) / everyone.length;
  const total = items.length;

  const matches = guys
    .map((g) => {
      const same = items.map((_, i) => i).filter((i) => g.picks[i] === mine[i]);
      const shared = same
        .filter((i) => items[i].chip[mine[i]])
        .sort((x, y) => rarity(x) - rarity(y))
        .map((i) => items[i].chip[mine[i]] as string);
      return { ...g, n: same.length, shared };
    })
    .sort((a, b) => b.n - a.n || b.shared.length - a.shared.length);

  if (!matches.length) {
    return (
      <div className="tot">
        <p className="eyebrow">Your matches</p>
        <p className="fine">Nobody else has played yet. Your matches show up here as guys answer.</p>
      </div>
    );
  }

  const label = (n: number) => {
    const pct = n / total;
    return pct >= 0.8 ? "Twins" : pct >= 0.6 ? "Same wavelength" : pct >= 0.4 ? "Half and half" : "Opposites attract";
  };
  const asked = items.some((it) => it.q);

  return (
    <div className="tot">
      <p className="eyebrow">
        Your matches · {matches.length} {matches.length === 1 ? "guy" : "guys"} played
      </p>
      <ul className="tot-list">
        {matches.map((g, rank) => (
          <li key={g.id} className={rank === 0 && matches.length > 1 ? "tot-card tot-top" : "tot-card"}>
            <details>
              <summary>
                <Avatar src={g.photo} name={g.name} size={52} />
                <span className="tot-who">
                  <b>{g.name}</b>
                  <span className="fine">{rank === 0 && matches.length > 1 ? `Most like you · ${label(g.n)}` : label(g.n)}</span>
                </span>
                <span className="tot-score">
                  {g.n}
                  <small>/{total}</small>
                </span>
              </summary>
              <div className="tot-more">
                <table className="tot-table">
                  <thead>
                    <tr>
                      {asked && <th />}
                      <th>You</th>
                      <th>{g.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className={g.picks[i] === mine[i] ? "same" : ""}>
                        {asked && <td className="tot-q">{it.q}</td>}
                        <td>{it.options[mine[i]]}</td>
                        <td>{it.options[g.picks[i]]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link href={`/circle/guy/${g.id}`} className="btn btn-outline btn-small">
                  See {g.name}&apos;s profile
                </Link>
              </div>
            </details>
            {g.shared.length > 0 && (
              <ul className="tot-shared" data-label={sharedLabel}>
                {g.shared.slice(0, 4).map((s) => (
                  <li key={s}>{s}</li>
                ))}
                {g.shared.length > 4 && <li className="tot-plus">+{g.shared.length - 4}</li>}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <p className="fine">Tap a guy to compare every answer.</p>

      {split && everyone.length >= 3 && (
        <details className="tot-split">
          <summary>How the whole Circle split</summary>
          <ul className="splits">
            {items.map((it, i) => {
              const pct = Math.round((100 * chose(i, 0)) / everyone.length);
              return (
                <li key={i}>
                  <span className={pct >= 50 ? "win" : ""}>
                    {it.options[0]} {pct}%
                  </span>
                  <span className="split-bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className={pct < 50 ? "win" : ""}>
                    {100 - pct}% {it.options[1]}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
