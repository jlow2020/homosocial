import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, UUID } from "@/lib/admin";
import { ageFrom, SEASON } from "@/lib/season";
import { circleLabel, loadCircles, loadPeople } from "../../data";
import { stageTone } from "../../util";

// God view: everyone in the Circle, faces and all, whatever stage he's at.
export default async function CircleInside({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { db } = await requireAdmin();
  const [circles, people] = await Promise.all([loadCircles(db), loadPeople(db)]);
  const circle = circles.find((c) => c.id === id);
  if (!circle) notFound();

  const order = ["Seated", "Lobby", "Realness pending", "Paused", "Banned", "Waitlist"];
  const inside = people
    .filter((p) => p.profile?.circle_id === id)
    .sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage));
  const seated = inside.filter((p) => p.stage === "Seated").length;

  const { data: signed } = inside.length
    ? await db.storage.from("photos").createSignedUrls(inside.map((p) => p.profile!.photo_path), 3600)
    : { data: [] };
  const photo = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="admin-stack">
      <p>
        <Link href="/admin/circles">All Circles</Link>
      </p>
      <h2 className="admin-h2">{circleLabel(circle)}</h2>
      <p className="admin-sub">
        {seated} of {circle.capacity} seats taken ·{" "}
        {seated >= SEASON.minToOpen ? "started" : `${SEASON.minToOpen - seated} more to start`}
      </p>
      <ul className="member-list">
        {inside.map((p) => (
          <li key={p.id} className="member">
            {photo.get(p.profile!.photo_path) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.get(p.profile!.photo_path)!} alt="" className="member-photo" />
            ) : (
              <span className="member-photo" aria-hidden="true" />
            )}
            <div className="member-body">
              <p className="member-name">
                <Link href={`/admin/members/${p.id}`} className="plain-link">
                  {p.profile!.first_name}, {ageFrom(p.profile!.birthdate)}
                </Link>
              </p>
              <span className={`pill ${stageTone(p.stage)}`}>{p.stage}</span>
              <p className="member-into">Into {p.profile!.interests}</p>
              <p className="member-take">&ldquo;{p.profile!.hot_take}&rdquo;</p>
            </div>
          </li>
        ))}
      </ul>
      {inside.length === 0 && <p className="admin-sub">Nobody in this Circle.</p>}
    </div>
  );
}
