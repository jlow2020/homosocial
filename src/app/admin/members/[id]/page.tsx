import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, requireAdmin, ROLE_TITLE, UUID } from "@/lib/admin";
import type { Profile } from "@/lib/supabase-server";
import { ageFrom } from "@/lib/season";
import { circleLabel, loadCircles } from "../../data";
import { pct, stageOf, stageTone, when } from "../../util";
import AdminActions from "./AdminActions";
import StaffBadge from "@/components/StaffBadge";

type Verification = {
  clientMatch?: number;
  serverMatch?: number | null;
  passed?: boolean;
  attempt?: number;
  frames?: string[];
  neutralFrames?: string[];
  at?: string;
};

export default async function Member({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const a = await requireAdmin();
  const { db } = a;

  const [{ data: authUser }, { data: profileRow }, { data: login }, { data: idCheck }, circles, targetRole, reportsAgainst, reportsBy, blocks, { data: log }] =
    await Promise.all([
      db.auth.admin.getUserById(id),
      db.from("profiles").select("*").eq("id", id).maybeSingle(),
      db.from("logins").select("username").eq("user_id", id).maybeSingle(),
      db.from("id_checks").select("doc_kind, issuer, face_match, checked_at").eq("user_id", id).maybeSingle(),
      loadCircles(db),
      isAdmin(id),
      db.from("reports").select("id, created_at, reason, details, reporter").eq("reported", id).order("created_at", { ascending: false }),
      db.from("reports").select("id, created_at, reason, reported").eq("reporter", id).order("created_at", { ascending: false }),
      db.from("blocks").select("blocker, blocked").or(`blocker.eq.${id},blocked.eq.${id}`),
      db.from("admin_log").select("at, action, admin_id").eq("target", id).order("at", { ascending: false }).limit(20),
    ]);

  const user = authUser?.user;
  if (!user && !profileRow) notFound();
  const p = profileRow as (Profile & { notes: string | null; verification: Verification | null; created_at: string; founder_no: number | null }) | null;
  const username = (login?.username as string | undefined) ?? null;
  const stage = stageOf(p, !!username);
  const circle = p?.circle_id ? circles.find((c) => c.id === p.circle_id) : undefined;
  const v = p?.verification ?? null;

  // Names for everyone mentioned on this page.
  const otherIds = [
    ...(reportsAgainst.data ?? []).map((r) => r.reporter as string),
    ...(reportsBy.data ?? []).map((r) => r.reported as string),
  ];
  const { data: others } = otherIds.length
    ? await db.from("profiles").select("id, first_name").in("id", otherIds)
    : { data: [] };
  const nameOf = new Map((others ?? []).map((o) => [o.id as string, o.first_name as string]));

  const framePaths = [...(v?.neutralFrames ?? []), ...(v?.frames ?? [])];
  const [{ data: photoUrl }, { data: frameUrls }] = await Promise.all([
    p?.photo_path ? db.storage.from("photos").createSignedUrl(p.photo_path, 3600) : Promise.resolve({ data: null }),
    framePaths.length
      ? db.storage.from("verifications").createSignedUrls(framePaths, 3600)
      : Promise.resolve({ data: [] as { signedUrl: string }[] }),
  ]);

  const blockedBy = (blocks.data ?? []).filter((b) => b.blocked === id).length;
  const blocking = (blocks.data ?? []).filter((b) => b.blocker === id).length;

  return (
    <div className="admin-stack">
      <p>
        <Link href="/admin/members">All members</Link>
      </p>

      <section className="who">
        {photoUrl?.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl.signedUrl} alt="" className="who-photo" />
        ) : (
          <span className="who-photo" aria-hidden="true" />
        )}
        <div className="who-main">
          <h2 className="admin-h2">
            {p ? `${p.first_name}, ${ageFrom(p.birthdate)}` : (user?.email ?? "No profile")}
            {targetRole && <StaffBadge title={ROLE_TITLE[targetRole]} />}
          </h2>
          <p className="admin-sub">
            {username ? `@${username}` : "no username"} · {user?.email ?? p?.email ?? "no email"}
          </p>
          <span className={`pill ${stageTone(stage)}`}>{stage}</span>
        </div>
      </section>

      <div className="admin-two">
        <section>
          <h3 className="admin-h3">Account</h3>
          <dl className="facts-grid">
            <dt>Signed up</dt>
            <dd>{when(user?.created_at)}</dd>
            <dt>Last sign-in</dt>
            <dd>{when(user?.last_sign_in_at)}</dd>
            <dt>Birthdate</dt>
            <dd>{p?.birthdate ?? "n/a"}</dd>
            <dt>Zip</dt>
            <dd>
              {p?.zip ?? "n/a"} {(p as { city?: string | null } | null)?.city ? `(${(p as { city?: string | null; state?: string | null }).city}, ${(p as { state?: string | null }).state})` : p ? "(zip not found)" : ""}
            </dd>
            <dt>Circle</dt>
            <dd>{circle ? <Link href={`/admin/circles/${circle.id}`}>{circleLabel(circle)}</Link> : "none"}</dd>
            <dt>Looking for</dt>
            <dd>{p ? (p.looking_for === "friends_dating" ? "Friends and dating" : "Friends") : "n/a"}</dd>
            <dt>Into</dt>
            <dd>{p?.interests ?? "n/a"}</dd>
            <dt>Hot take</dt>
            <dd>{p?.hot_take ?? "n/a"}</dd>
            <dt>Founder</dt>
            <dd>{p?.founder_no ? `#${p.founder_no}` : "no"}</dd>
            <dt>User id</dt>
            <dd className="mono">{id}</dd>
          </dl>
        </section>

        <section>
          <h3 className="admin-h3">Checks</h3>
          <dl className="facts-grid">
            <dt>Realness</dt>
            <dd>{p?.verified_at ? `Passed ${when(p.verified_at)}` : "Not passed"}</dd>
            <dt>Tries</dt>
            <dd>{p?.verification_attempts ?? 0}</dd>
            <dt>Face match</dt>
            <dd>
              server {pct(v?.serverMatch)} · phone {pct(v?.clientMatch)}
            </dd>
            <dt>ID check</dt>
            <dd>{p?.id_verified_at ? `Passed ${when(p.id_verified_at)}` : "Not passed"}</dd>
            <dt>ID tries</dt>
            <dd>{p?.id_attempts ?? 0}</dd>
            <dt>ID used</dt>
            <dd>{idCheck ? `${idCheck.doc_kind}, ${idCheck.issuer ?? "unknown issuer"}` : "n/a"}</dd>
            <dt>ID face match</dt>
            <dd>{idCheck ? `${pct(idCheck.face_match)} (pass is 0.480 or higher)` : "n/a"}</dd>
          </dl>
          {(frameUrls ?? []).length > 0 && (
            <>
              <p className="admin-sub" style={{ marginTop: 12 }}>
                Realness Check frames, latest try
              </p>
              <div className="frames">
                {(frameUrls ?? []).map((f, i) =>
                  f.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={f.signedUrl} alt="" />
                  ) : null
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <section>
        <h3 className="admin-h3">Do something</h3>
        <AdminActions
          id={id}
          isSelf={id === a.me.userId}
          hasProfile={!!p}
          status={p?.status ?? null}
          circleId={p?.circle_id ?? null}
          circles={circles.map((c) => ({ id: c.id, label: circleLabel(c) }))}
          notes={p?.notes ?? ""}
          viewerIsGod={a.role === "god"}
          targetRole={targetRole}
        />
      </section>

      <div className="admin-two">
        <section>
          <h3 className="admin-h3">Reports against him ({(reportsAgainst.data ?? []).length})</h3>
          <ul className="alist">
            {(reportsAgainst.data ?? []).map((r) => (
              <li key={r.id}>
                <span className="pill pill-hot">{r.reason}</span>
                <span>
                  by <Link href={`/admin/members/${r.reporter}`}>{nameOf.get(r.reporter) ?? "someone"}</Link>
                  {r.details ? `: ${r.details}` : ""}
                </span>
                <span className="admin-sub">{when(r.created_at)}</span>
              </li>
            ))}
          </ul>
          <p className="admin-sub">
            Blocked by {blockedBy} · blocking {blocking}
          </p>
        </section>
        <section>
          <h3 className="admin-h3">Reports he filed ({(reportsBy.data ?? []).length})</h3>
          <ul className="alist">
            {(reportsBy.data ?? []).map((r) => (
              <li key={r.id}>
                <span className="pill pill-plain">{r.reason}</span>
                <Link href={`/admin/members/${r.reported}`}>{nameOf.get(r.reported) ?? "someone"}</Link>
                <span className="admin-sub">{when(r.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <h3 className="admin-h3">Admin history</h3>
        {(log ?? []).length === 0 ? (
          <p className="admin-sub">No admin actions on him.</p>
        ) : (
          <ul className="alist">
            {(log ?? []).map((l, i) => (
              <li key={i}>
                <span>{l.action}</span>
                <span className="admin-sub">{when(l.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
