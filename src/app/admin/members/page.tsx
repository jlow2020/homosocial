import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ageFrom } from "@/lib/season";
import { circleLabel, loadCircles, loadPeople } from "../data";
import { STAGES, stageTone, when, type Stage } from "../util";

export default async function Members({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const { db } = await requireAdmin();
  const { q = "", stage = "" } = await searchParams;
  const [people, circles] = await Promise.all([loadPeople(db), loadCircles(db)]);
  const circleOf = new Map(circles.map((c) => [c.id, c]));

  const needle = q.trim().toLowerCase();
  const shown = people.filter((p) => {
    if (stage && p.stage !== stage) return false;
    if (!needle) return true;
    return [p.email, p.username, p.profile?.first_name, p.profile?.zip, p.id]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(needle));
  });

  const withPhoto = shown.filter((p) => p.profile?.photo_path).slice(0, 200);
  const { data: signed } = withPhoto.length
    ? await db.storage.from("photos").createSignedUrls(withPhoto.map((p) => p.profile!.photo_path), 3600)
    : { data: [] };
  const photo = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="admin-stack">
      <form className="admin-filter" action="/admin/members">
        <label className="visually-hidden" htmlFor="q">
          Search
        </label>
        <input id="q" name="q" defaultValue={q} className="input" placeholder="Name, username, email or zip" />
        <label className="visually-hidden" htmlFor="stage">
          Stage
        </label>
        <select id="stage" name="stage" defaultValue={stage} className="input">
          <option value="">Every stage</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn btn-gold btn-small" type="submit">
          Filter
        </button>
      </form>

      <p className="admin-sub">
        {shown.length} of {people.length}
      </p>

      <ul className="people">
        {shown.map((p) => {
          const c = p.profile?.circle_id ? circleOf.get(p.profile.circle_id) : undefined;
          const src = p.profile?.photo_path ? photo.get(p.profile.photo_path) : undefined;
          return (
            <li key={p.id}>
              <Link href={`/admin/members/${p.id}`} className="person">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="person-photo" />
                ) : (
                  <span className="person-photo" aria-hidden="true" />
                )}
                <span className="person-main">
                  <span className="person-name">
                    {p.profile ? `${p.profile.first_name}, ${ageFrom(p.profile.birthdate)}` : (p.email ?? "No email")}
                  </span>
                  <span className="admin-sub">
                    {p.username ? `@${p.username}` : "no username"} · {p.email ?? ""}
                  </span>
                  <span className="admin-sub">
                    {c ? circleLabel(c) : p.profile?.zip ? `Zip ${p.profile.zip}` : "Not placed"} · joined {when(p.signedUpAt)}
                  </span>
                </span>
                <span className={`pill ${stageTone(p.stage as Stage)}`}>{p.stage}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="admin-sub">Nobody matches.</p>}
    </div>
  );
}
