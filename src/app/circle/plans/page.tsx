import { redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { etLabel } from "@/lib/game/clock";
import { Avatar, GuyName, Shell } from "../ui";
import PlanForm from "./PlanForm";
import RsvpButton from "./RsvpButton";

export const dynamic = "force-dynamic";

type PlanRow = {
  id: string;
  user_id: string;
  title: string;
  place: string | null;
  starts_at: string | null;
  details: string | null;
  held: boolean;
  plan_rsvps: { user_id: string }[];
};

export default async function Plans() {
  const pl = await loadPlayer({ needSeat: true });
  if (pl.clock.phase === "filling") redirect("/circle");
  const { data } = await pl.db
    .from("plans")
    .select("id, user_id, title, place, starts_at, details, held, plan_rsvps(user_id)")
    .eq("circle_id", pl.circle.id)
    .order("starts_at", { ascending: true, nullsFirst: false });
  const byId = new Map(pl.members.map((m) => [m.id, m]));
  const cutoff = Date.now() - 6 * 3600e3;
  const all = ((data ?? []) as PlanRow[]).filter((p) => byId.has(p.user_id) && (!p.held || p.user_id === pl.profile.id));
  const upcoming = all.filter((p) => !p.starts_at || new Date(p.starts_at).getTime() >= cutoff);
  const past = all.filter((p) => p.starts_at && new Date(p.starts_at).getTime() < cutoff).reverse();
  const urls = await photoUrls(pl.db, pl.members.map((m) => m.photo_path));

  const card = (p: PlanRow, done = false) => {
    const host = byId.get(p.user_id);
    const going = p.plan_rsvps.map((r) => r.user_id).filter((id) => byId.has(id));
    const imIn = going.includes(pl.profile.id);
    return (
      <li key={p.id} className={done ? "plan plan-past" : "plan"}>
        <div className="plan-main">
          <p className="eyebrow">{p.starts_at ? etLabel(new Date(p.starts_at)) : "Time TBD"}</p>
          <h2 className="plan-title">{p.title}</h2>
          {p.held && <span className="held-tag">⏳ Waiting on a quick look. Only you see this for now.</span>}
          {p.place && <p className="plan-place">📍 {p.place}</p>}
          {p.details && <p className="plan-details">{p.details}</p>}
          <p className="fine">
            Posted by <GuyName pl={pl} m={host} />
          </p>
        </div>
        <div className="plan-side">
          <div className="faces">
            {going.slice(0, 8).map((id) => (
              <Avatar key={id} src={urls.get(byId.get(id)!.photo_path)} name={byId.get(id)!.first_name} size={30} />
            ))}
          </div>
          <p className="fine">
            {going.length} going{imIn ? ", including you" : ""}
          </p>
          {!done && <RsvpButton planId={p.id} going={imIn} />}
        </div>
      </li>
    );
  };

  return (
    <Shell pl={pl}>
      <div className="plans-head">
        <div>
          <h1 className="game-h1">Plans</h1>
          <p className="fine">Meet in public the first time.</p>
        </div>
      </div>
      <PlanForm />
      <ul className="plan-list">{upcoming.map((p) => card(p))}</ul>
      {upcoming.length === 0 && <p className="fine">Nothing coming up.</p>}
      {past.length > 0 && (
        <>
          <h2 className="admin-h3" style={{ marginTop: 32 }}>
            Already happened
          </h2>
          <ul className="plan-list">{past.map((p) => card(p, true))}</ul>
        </>
      )}
    </Shell>
  );
}
