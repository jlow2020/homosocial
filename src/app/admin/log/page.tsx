import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { when } from "../util";

export default async function Log() {
  const { db } = await requireAdmin();
  const { data: log } = await db
    .from("admin_log")
    .select("id, at, action, target, admin_id")
    .order("at", { ascending: false })
    .limit(300);
  const ids = [...new Set((log ?? []).flatMap((l) => [l.target, l.admin_id]).filter(Boolean) as string[])];
  const [{ data: profiles }, { data: logins }] = await Promise.all([
    ids.length ? db.from("profiles").select("id, first_name").in("id", ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from("logins").select("user_id, username").in("user_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const name = new Map<string, string>();
  for (const l of logins ?? []) name.set(l.user_id as string, `@${l.username}`);
  for (const p of profiles ?? []) name.set(p.id as string, p.first_name as string);

  return (
    <div className="admin-stack">
      <h2 className="admin-h2">Admin log</h2>
      <p className="admin-sub">Every admin action, newest first. Nobody can edit this from the site.</p>
      <div className="table-scroll">
        <table className="atable">
          <thead>
            <tr>
              <th>When</th>
              <th>Admin</th>
              <th>Did</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {(log ?? []).map((l) => (
              <tr key={l.id}>
                <td>{when(l.at)}</td>
                <td>{l.admin_id ? (name.get(l.admin_id) ?? "admin") : "removed"}</td>
                <td>{l.action}</td>
                <td>{l.target ? <Link href={`/admin/members/${l.target}`}>{name.get(l.target) ?? "someone"}</Link> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(log ?? []).length === 0 && <p className="admin-sub">Nothing yet.</p>}
    </div>
  );
}
