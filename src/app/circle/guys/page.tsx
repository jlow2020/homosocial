import Link from "next/link";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { ageFrom } from "@/lib/season";
import StaffBadge from "@/components/StaffBadge";
import FounderBadge from "@/components/FounderBadge";
import { Shell } from "../ui";

export const dynamic = "force-dynamic";

export default async function Guys() {
  const pl = await loadPlayer({ needSeat: true });
  const urls = await photoUrls(pl.db, pl.members.map((m) => m.photo_path));
  const ordered = [...pl.members.filter((m) => m.id === pl.profile.id), ...pl.members.filter((m) => m.id !== pl.profile.id)];
  return (
    <Shell pl={pl}>
      <h1 className="game-h1">Who&apos;s in</h1>
      <p className="fine">
        {pl.members.length} of {pl.circle.capacity} seats taken.
      </p>
      <ul className="guy-grid">
        {ordered.map((m) => (
          <li key={m.id}>
            <Link href={m.id === pl.profile.id ? "/profile" : `/circle/guy/${m.id}`} className="guy-card">
              {urls.get(m.photo_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls.get(m.photo_path)} alt="" className="guy-card-photo" />
              ) : (
                <span className="guy-card-photo" />
              )}
              <span className="guy-card-body">
                <span className="member-name">
                  {m.first_name}, {ageFrom(m.birthdate)}
                  {m.id === pl.profile.id && <span className="member-you"> (you)</span>}
                </span>
                <span className="badges">
                  {pl.titles.get(m.id) && <StaffBadge title={pl.titles.get(m.id)!} />}
                  {m.founder_no && <FounderBadge no={m.founder_no} />}
                </span>
                <span className="member-into">Into {m.interests}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
