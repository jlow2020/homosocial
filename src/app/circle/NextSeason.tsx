import { closesAt, etLabel } from "@/lib/game/clock";
import type { Player } from "@/lib/game/player";
import { joinNextSeason } from "./actions";

// After the Finale: the way into the next Season.
export default function NextSeason({ pl }: { pl: Player }) {
  if (pl.clock.phase !== "revealed" || pl.past) return null;
  const closes = closesAt(pl.clock.finaleAt);
  return (
    <section className="event-card event-next">
      <p className="eyebrow">Season {pl.seasonNo} is over</p>
      <h2>New Season, new guys.</h2>
      <p>A fresh Circle near you, starting now. Your mutuals and chats come with you.</p>
      <form action={joinNextSeason}>
        <button className="btn btn-pink">Join Season {pl.seasonNo + 1}</button>
      </form>
      <p className="fine">
        {pl.closed
          ? "This Circle is read-only now. You can look back at it anytime."
          : `This Circle stays open for goodbyes until ${etLabel(closes, pl.circle.tz ?? undefined)}.`}
      </p>
    </section>
  );
}
