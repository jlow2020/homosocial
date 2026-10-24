import { redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { postLounge } from "../game-actions";
import { Avatar, GuyName, Shell, timeAgo } from "../ui";
import Composer from "../Composer";
import Live from "../Live";

export const dynamic = "force-dynamic";

export default async function Lounge() {
  const pl = await loadPlayer({ needSeat: true });
  if (pl.waiting) redirect("/circle");
  const { data } = await pl.db
    .from("lounge_messages")
    .select("id, user_id, body, created_at, held")
    .eq("circle_id", pl.circle.id)
    .order("created_at", { ascending: false })
    .limit(150);
  const byId = new Map(pl.members.map((m) => [m.id, m]));
  const msgs = (data ?? []).filter((m) => byId.has(m.user_id) && (!m.held || m.user_id === pl.profile.id)).reverse();
  const urls = await photoUrls(pl.db, pl.members.map((m) => m.photo_path));

  return (
    <Shell pl={pl}>
      <Live />
      <div className="chat">
        <div className="chat-head">
          <h1 className="game-h1">The Lounge</h1>
        </div>
        <ul className="chat-list">
          {msgs.map((m, i) => {
            const guy = byId.get(m.user_id);
            const same = i > 0 && msgs[i - 1].user_id === m.user_id;
            const mine = m.user_id === pl.profile.id;
            return (
              <li key={m.id} className={`${mine ? "msg msg-mine" : "msg"}${same ? " msg-cont" : ""}`}>
                {!mine && !same && <Avatar src={guy ? urls.get(guy.photo_path) : undefined} name={guy?.first_name ?? ""} size={34} />}
                <div className="msg-body">
                  {!mine && !same && <GuyName pl={pl} m={guy} />}
                  <p className="bubble">{m.body}</p>
                  {m.held && <span className="held-tag">⏳ Waiting on a quick look. Only you see this for now.</span>}
                  <span className="fine msg-time">{timeAgo(m.created_at)}</span>
                </div>
              </li>
            );
          })}
        </ul>
        {msgs.length === 0 && <p className="fine">Quiet in here.</p>}
        <Composer send={postLounge} placeholder="Say something to the Circle" />
      </div>
    </Shell>
  );
}
