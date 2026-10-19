import { requireAdmin } from "@/lib/admin";
import { PROMPTS } from "@/lib/game/prompts";
import { FORMATS } from "@/lib/game/templates";
import { when } from "../util";
import { PickForm, ReviewForm } from "./DropForms";

type Row = {
  id: string;
  body: string;
  hint: string | null;
  week: number;
  heat: number;
  mode: string;
  credit: string | null;
  source: string;
  status: string;
  pinned: boolean;
  times_used: number;
  created_at: string;
};

export default async function Drops() {
  const { db } = await requireAdmin();
  const [{ data: bank }, { data: recent }] = await Promise.all([
    db.from("prompt_bank").select("*").order("created_at", { ascending: false }),
    db
      .from("drops")
      .select("week, season_no, body, prompt_id, mode, heat, source, credit, created_at, circles(number, region)")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  const rows = (bank ?? []) as Row[];
  const queued = rows.filter((r) => r.status === "queued");
  const approved = rows.filter((r) => r.status === "approved");
  const retired = rows.filter((r) => r.status === "retired");
  const combos = FORMATS.reduce((n, f) => n + f.plugs.length, 0);

  return (
    <div className="admin-stack">
      <section>
        <h2 className="admin-h2">The drop bank</h2>
        <p className="admin-sub">
          {PROMPTS.length} house drops · {combos} format combos · {approved.length} approved from members and you · {queued.length} waiting on you.
          Every Circle gets a drop it has never seen, at its heat. Members&apos; drops and your Picks go first, then follow-ups on last week&apos;s top answer, then formats, then the house bank.
        </p>
      </section>

      <section className="act">
        <h3>Daddy&apos;s Pick</h3>
        <p className="admin-sub">Straight into the bank, no queue. Pin it and every Circle hitting that week gets it before anything else.</p>
        <PickForm />
      </section>

      <section>
        <h3 className="admin-h3">Waiting on you ({queued.length})</h3>
        {queued.length === 0 && <p className="admin-sub">Nothing in the queue. Guys write drops from any drop page, Week 2 on.</p>}
        <ul className="alist review-list">
          {queued.map((d) => (
            <li key={d.id} className="review">
              <p className="admin-sub">
                by {d.credit ?? "someone"} · {when(d.created_at)}
              </p>
              <ReviewForm d={d} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="admin-h3">In the bank ({approved.length})</h3>
        <ul className="alist review-list">
          {approved.map((d) => (
            <li key={d.id} className="review">
              <p className="admin-sub">
                {d.source === "daddy" ? "Daddy's Pick" : `by ${d.credit}`} · used {d.times_used}× {d.pinned && "· pinned"}
              </p>
              <ReviewForm d={d} />
            </li>
          ))}
        </ul>
      </section>

      {retired.length > 0 && (
        <section>
          <h3 className="admin-h3">Retired ({retired.length})</h3>
          <ul className="alist review-list">
            {retired.map((d) => (
              <li key={d.id} className="review">
                <p className="admin-sub">{d.credit}</p>
                <ReviewForm d={d} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="admin-h3">Latest drops, every Circle</h3>
        <div className="table-scroll">
          <table className="atable">
            <thead>
              <tr>
                <th>When</th>
                <th>Circle</th>
                <th>Wk</th>
                <th>Heat</th>
                <th>From</th>
                <th>Drop</th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map((d, i) => {
                const c = d.circles as unknown as { number: number; region: string } | null;
                return (
                  <tr key={i}>
                    <td>{when(d.created_at)}</td>
                    <td>
                      {c?.number} · {c?.region}
                    </td>
                    <td className="num">
                      S{d.season_no} W{d.week}
                    </td>
                    <td>{"🔥".repeat(d.heat ?? 0)}</td>
                    <td>
                      <span className="pill pill-plain">{d.source}</span>
                    </td>
                    <td className="wrap-cell">
                      {d.body ?? d.prompt_id}
                      {d.credit ? ` (by ${d.credit})` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
