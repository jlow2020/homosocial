import { redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { Avatar, GuyName, Shell, timeAgo } from "../ui";
import RoseForm from "./RoseForm";

export const dynamic = "force-dynamic";

export default async function Roses() {
  const pl = await loadPlayer({ needSeat: true });
  const week = pl.clock.phase === "season" ? pl.clock.week : pl.clock.phase === "revealed" ? 9 : 0;
  if (week < 7) redirect("/circle");
  const { data } = await pl.db
    .from("roses")
    .select("id, from_id, to_id, body, created_at")
    .eq("circle_id", pl.circle.id)
    .eq("season_no", pl.circle.season_no)
    .order("created_at", { ascending: false });
  const byId = new Map(pl.members.map((m) => [m.id, m]));
  const roses = (data ?? []).filter((r) => byId.has(r.from_id) && byId.has(r.to_id));
  const given = roses.filter((r) => r.from_id === pl.profile.id);
  const toMe = roses.filter((r) => r.to_id === pl.profile.id);
  const urls = await photoUrls(pl.db, pl.members.map((m) => m.photo_path));
  const open = week === 7 || week === 8;

  return (
    <Shell pl={pl}>
      <div className="roses-head">
        <h1 className="game-h1">🌹 Roses</h1>
        <p className="game-lede">Say something kind about someone, out loud, by name. Everyone in the Circle sees it.</p>
      </div>

      {toMe.length > 0 && (
        <p className="rose-count">
          You got <b>{toMe.length}</b> {toMe.length === 1 ? "Rose" : "Roses"}.
        </p>
      )}

      {open && given.length < 3 && (
        <RoseForm
          left={3 - given.length}
          guys={pl.members
            .filter((m) => m.id !== pl.profile.id && !given.some((g) => g.to_id === m.id))
            .map((m) => ({ id: m.id, name: m.first_name }))}
        />
      )}
      {open && given.length >= 3 && <p className="fine">You&apos;ve given all 3 of your Roses.</p>}

      <ul className="rose-wall">
        {roses.map((r) => {
          const from = byId.get(r.from_id);
          const to = byId.get(r.to_id);
          return (
            <li key={r.id} className={r.to_id === pl.profile.id ? "rose rose-me" : "rose"}>
              <div className="rose-to">
                <Avatar src={to ? urls.get(to.photo_path) : undefined} name={to?.first_name ?? ""} size={40} />
                <span>
                  🌹 for <GuyName pl={pl} m={to} />
                </span>
              </div>
              <p className="rose-body">&ldquo;{r.body}&rdquo;</p>
              <p className="fine">
                from {from?.first_name} · {timeAgo(r.created_at)}
              </p>
            </li>
          );
        })}
      </ul>
      {roses.length === 0 && <p className="fine">No Roses yet. Be the first.</p>}
    </Shell>
  );
}
