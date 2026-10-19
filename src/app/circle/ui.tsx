import Link from "next/link";
import TopBar from "@/components/TopBar";
import StaffBadge from "@/components/StaffBadge";
import { WEEKS, ageFrom } from "@/lib/season";
import type { Player, Member } from "@/lib/game/player";
import NavTabs from "./NavTabs";
import TestBar from "./TestBar";

export function weekTitle(week: number): string {
  return WEEKS.find((w) => w.n === week)?.title ?? "";
}

export async function Shell({ pl, children }: { pl: Player; children: React.ReactNode }) {
  const c = pl.clock;
  // DM requests waiting on him.
  const { count: unread } = await pl.db
    .from("dm_threads")
    .select("id", { count: "exact", head: true })
    .or(`a.eq.${pl.profile.id},b.eq.${pl.profile.id}`)
    .is("accepted_at", null)
    .neq("requested_by", pl.profile.id);
  const tag =
    c.phase === "filling"
      ? "Filling up"
      : c.phase === "revealed"
        ? "Finale: revealed"
        : `Week ${c.week}: ${weekTitle(c.week)}`;
  const dropWeek = c.phase === "season" ? c.week : c.phase === "revealed" ? 8 : null;
  return (
    <main className="game">
      <TopBar
        right={
          <div className="row" style={{ gap: 20 }}>
            {pl.role && (
              <Link href="/admin" className="topbar-link">
                Admin
              </Link>
            )}
            <Link href="/profile" className="topbar-link">
              Profile
            </Link>
          </div>
        }
      />
      {pl.role && pl.circle.is_test && <TestBar circleId={pl.circle.id} clock={c} seasonNo={pl.circle.season_no} />}
      <div className="wrap game-head">
        <div className="chyron">
          <span className={c.phase === "filling" ? "chy-hot" : "chy-gold"}>{tag}</span>
          <span className="chy-light">
            Circle {pl.circle.number}
            {pl.circle.is_test ? " · Test" : ""} · Season {pl.circle.season_no}
          </span>
        </div>
      </div>
      {pl.seated && c.phase !== "filling" && <NavTabs dropWeek={dropWeek} unread={unread ?? 0} />}
      <div className="wrap game-body">{children}</div>
    </main>
  );
}

export function Avatar({ src, name, size = 48 }: { src?: string; name: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="avatar" style={{ width: size, height: size }} />
  ) : (
    <span className="avatar avatar-empty" style={{ width: size, height: size }} aria-label={name} />
  );
}

export function GuyName({ pl, m, link = true, age = false }: { pl: Player; m: Member | undefined; link?: boolean; age?: boolean }) {
  if (!m) return <span className="guy-name">Someone</span>;
  const label = (
    <>
      {m.first_name}
      {age && `, ${ageFrom(m.birthdate)}`}
      {m.id === pl.profile.id && <span className="member-you"> (you)</span>}
    </>
  );
  const title = pl.titles.get(m.id);
  return (
    <span className="guy-name-row">
      {link && m.id !== pl.profile.id ? (
        <Link href={`/circle/guy/${m.id}`} className="guy-name">
          {label}
        </Link>
      ) : (
        <span className="guy-name">{label}</span>
      )}
      {title && <StaffBadge title={title} />}
    </span>
  );
}

const ago = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return ago.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return ago.format(-Math.floor(s / 3600), "hour");
  return ago.format(-Math.floor(s / 86400), "day");
}

export const EMOJI: Record<string, string> = { fire: "🔥", lol: "😂", crown: "👑", heart: "❤️" };
