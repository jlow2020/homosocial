import Link from "next/link";
import { Avatar } from "../../ui";

// This or That results, as matches: who's most like you, the picks you share
// (rarest first, since those say the most), and a tap to see every pair side by
// side or open his profile. How the whole Circle split sits folded underneath.

type Guy = { id: string; name: string; photo?: string; picks: number[] };

export default function ToTMatches({ pairs, mine, guys }: { pairs: [string, string][]; mine: number[]; guys: Guy[] }) {
  const everyone = [mine, ...guys.map((g) => g.picks)];
  // How many picked the left side of each pair, counting him.
  const left = pairs.map((_, i) => everyone.filter((p) => p[i] === 0).length);
  const share = (i: number, side: number) => (side === 0 ? left[i] : everyone.length - left[i]) / everyone.length;

  const matches = guys
    .map((g) => ({
      ...g,
      n: pairs.filter((_, i) => g.picks[i] === mine[i]).length,
      shared: pairs
        .map((_, i) => i)
        .filter((i) => g.picks[i] === mine[i])
        .sort((x, y) => share(x, mine[x]) - share(y, mine[y]))
        .map((i) => pairs[i][mine[i]]),
    }))
    .sort((a, b) => b.n - a.n);

  if (!matches.length) {
    return (
      <div className="tot">
        <p className="eyebrow">Your matches</p>
        <p className="fine">Nobody else has played yet. Your matches show up here as guys answer.</p>
      </div>
    );
  }

  const label = (n: number) => {
    const pct = n / pairs.length;
    return pct >= 0.8 ? "Twins" : pct >= 0.6 ? "Same wavelength" : pct >= 0.4 ? "Half and half" : "Opposites attract";
  };

  return (
    <div className="tot">
      <p className="eyebrow">Your matches · {matches.length} {matches.length === 1 ? "guy" : "guys"} played</p>
      <ul className="tot-list">
        {matches.map((g, rank) => (
          <li key={g.id} className={rank === 0 ? "tot-card tot-top" : "tot-card"}>
            <details>
              <summary>
                <Avatar src={g.photo} name={g.name} size={52} />
                <span className="tot-who">
                  <b>{g.name}</b>
                  <span className="fine">{rank === 0 && matches.length > 1 ? `Most like you · ${label(g.n)}` : label(g.n)}</span>
                </span>
                <span className="tot-score">
                  {g.n}
                  <small>/{pairs.length}</small>
                </span>
              </summary>
              <div className="tot-more">
                <table className="tot-table">
                  <thead>
                    <tr>
                      <th>You</th>
                      <th>{g.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((p, i) => (
                      <tr key={i} className={g.picks[i] === mine[i] ? "same" : ""}>
                        <td>{p[mine[i]]}</td>
                        <td>{p[g.picks[i]]}</td>
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
              <ul className="tot-shared" aria-label="You both picked">
                {g.shared.slice(0, 4).map((s) => (
                  <li key={s}>{s}</li>
                ))}
                {g.shared.length > 4 && <li className="tot-plus">+{g.shared.length - 4}</li>}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <p className="fine">Tap a guy to see every pick side by side.</p>

      {everyone.length >= 3 && (
        <details className="tot-split">
          <summary>How the whole Circle split</summary>
          <ul className="splits">
            {pairs.map(([a, b], i) => {
              const pct = Math.round((100 * left[i]) / everyone.length);
              return (
                <li key={a}>
                  <span className={pct >= 50 ? "win" : ""}>
                    {a} {pct}%
                  </span>
                  <span className="split-bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className={pct < 50 ? "win" : ""}>
                    {100 - pct}% {b}
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
