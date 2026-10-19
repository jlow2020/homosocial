import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { when } from "../util";
import AnswerToggle from "./AnswerToggle";

export default async function Reports() {
  const { db } = await requireAdmin();
  const { data: reports } = await db
    .from("reports")
    .select("id, created_at, reason, details, reporter, reported, answer_id, answers(hidden, body, drops(week))")
    .order("created_at", { ascending: false })
    .limit(500);
  const ids = [...new Set((reports ?? []).flatMap((r) => [r.reporter as string, r.reported as string]))];
  const { data: people } = ids.length
    ? await db.from("profiles").select("id, first_name, status").in("id", ids)
    : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id as string, p as { first_name: string; status: string }]));
  const against = new Map<string, number>();
  for (const r of reports ?? []) against.set(r.reported, (against.get(r.reported) ?? 0) + 1);

  return (
    <div className="admin-stack">
      <h2 className="admin-h2">Reports</h2>
      <p className="admin-sub">Three reports from different verified members pauses an account automatically.</p>
      <div className="table-scroll">
        <table className="atable">
          <thead>
            <tr>
              <th>When</th>
              <th>Reported</th>
              <th>Total</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Details</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {(reports ?? []).map((r) => {
              const target = who.get(r.reported);
              return (
                <tr key={r.id}>
                  <td>{when(r.created_at)}</td>
                  <td>
                    <Link href={`/admin/members/${r.reported}`}>{target?.first_name ?? "Unknown"}</Link>
                  </td>
                  <td className="num">{against.get(r.reported)}</td>
                  <td>
                    <span className={target?.status === "active" ? "pill pill-plain" : "pill pill-hot"}>{target?.status ?? "?"}</span>
                  </td>
                  <td>
                    <span className="pill pill-hot">{r.reason}</span>
                  </td>
                  <td className="wrap-cell">
                    {r.details ?? ""}
                    {r.answer_id && (() => {
                      const a = r.answers as unknown as { hidden: boolean; body: string | null; drops: { week: number } } | null;
                      return a ? (
                        <p className="fine">
                          Answer, Week {a.drops?.week}: &ldquo;{(a.body ?? "(media)").slice(0, 120)}&rdquo; {a.hidden ? <span className="pill pill-hot">pulled</span> : <span className="pill pill-plain">live</span>}{" "}
                          <AnswerToggle id={r.answer_id} hidden={a.hidden} />
                        </p>
                      ) : null;
                    })()}
                  </td>
                  <td>
                    <Link href={`/admin/members/${r.reporter}`}>{who.get(r.reporter)?.first_name ?? "Unknown"}</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(reports ?? []).length === 0 && <p className="admin-sub">No reports yet.</p>}
    </div>
  );
}
