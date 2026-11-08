import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { SEASON } from "@/lib/season";
import { loadCircles, loadPeople } from "./data";
import { STAGES, when } from "./util";
import { sendTestAlert } from "./actions";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ push?: string }> }) {
  const { db } = await requireAdmin();
  const { push } = await searchParams;
  const [people, circles, { data: reports }, { data: log }] = await Promise.all([
    loadPeople(db),
    loadCircles(db),
    db.from("reports").select("id, created_at, reason, reported").order("created_at", { ascending: false }).limit(5),
    db.from("admin_log").select("at, action, target, detail").not("action", "like", "digest:%").not("action", "like", "push:%").not("action", "like", "client:%").order("at", { ascending: false }).limit(8),
  ]);

  const count = new Map(STAGES.map((s) => [s, 0]));
  for (const p of people) count.set(p.stage, (count.get(p.stage) ?? 0) + 1);
  const seatedIn = new Map<string, number>();
  for (const p of people) {
    if (p.stage === "Seated" && p.profile?.circle_id) {
      seatedIn.set(p.profile.circle_id, (seatedIn.get(p.profile.circle_id) ?? 0) + 1);
    }
  }
  const nameOf = new Map(people.map((p) => [p.id, p.profile?.first_name ?? p.username ?? p.email ?? "?"]));
  const newThisWeek = people.filter((p) => Date.now() - Date.parse(p.signedUpAt) < 7 * 864e5).length;

  return (
    <div className="admin-stack">
      <section>
        <h2 className="admin-h2">Everyone</h2>
        <p className="admin-sub">
          {people.length} accounts · {newThisWeek} new in the last 7 days
        </p>
        <div className="tiles">
          {STAGES.map((s) => (
            <Link key={s} href={`/admin/members?stage=${encodeURIComponent(s)}`} className="tile">
              <b>{count.get(s)}</b>
              <span>{s}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="admin-h2">Circles</h2>
        <div className="table-scroll">
          <table className="atable">
            <thead>
              <tr>
                <th>Circle</th>
                <th>Home</th>
                <th>Season</th>
                <th>Seats</th>
                <th>State</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {circles.map((c) => {
                const n = seatedIn.get(c.id) ?? 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/circles/${c.id}`}>Circle {c.number}</Link>
                    </td>
                    <td>{c.label ?? "Not set yet"}</td>
                    <td>{c.season.toUpperCase()}</td>
                    <td className="num">
                      {n} / {c.capacity}
                    </td>
                    <td>
                      <span className={n >= SEASON.minToOpen ? "pill pill-mint" : "pill pill-gold"}>
                        {n >= SEASON.minToOpen ? "Started" : `Needs ${SEASON.minToOpen - n}`}
                      </span>
                    </td>
                    <td>{when(c.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {circles.length === 0 && <p className="admin-sub">No Circles yet.</p>}
      </section>

      <div className="admin-two">
        <section>
          <h2 className="admin-h2">Latest reports</h2>
          {(reports ?? []).length === 0 ? (
            <p className="admin-sub">No reports. Good.</p>
          ) : (
            <ul className="alist">
              {(reports ?? []).map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/members/${r.reported}`}>{nameOf.get(r.reported) ?? "Unknown"}</Link>
                  <span className="pill pill-hot">{r.reason}</span>
                  <span className="admin-sub">{when(r.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="admin-h2">Latest admin actions</h2>
          {(log ?? []).length === 0 ? (
            <p className="admin-sub">Nothing yet.</p>
          ) : (
            <ul className="alist">
              {(log ?? []).map((l, i) => (
                <li key={i}>
                  <span>{l.action}</span>
                  {l.target && <Link href={`/admin/members/${l.target}`}>{nameOf.get(l.target) ?? "someone"}</Link>}
                  <span className="admin-sub">{when(l.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section id="alerts">
        <h2 className="admin-h2">Alerts</h2>
        <p className="admin-sub">
          Signups, checks passed or failed, Circles starting, and a 9am list of who&apos;s stuck. Push to your phone
          {process.env.RESEND_API_KEY ? ` and email to ${process.env.ALERT_EMAIL || "jonathan@homosocial.net"}` : ". Email is off until RESEND_API_KEY is set in Railway"}.
        </p>
        <form action={sendTestAlert}>
          <button className="btn btn-outline btn-small">Send a test push to my devices</button>
        </form>
        {push && <p className="admin-sub" role="status">{push.slice(0, 400)}</p>}
      </section>
    </div>
  );
}
