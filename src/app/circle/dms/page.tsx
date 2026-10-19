import Link from "next/link";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { Avatar, Shell, timeAgo } from "../ui";

export const dynamic = "force-dynamic";

type Thread = {
  id: string;
  a: string;
  b: string;
  requested_by: string;
  accepted_at: string | null;
  last_at: string;
  read_a: string | null;
  read_b: string | null;
  dm_messages: { body: string | null; user_id: string; created_at: string }[];
};

export default async function Dms() {
  const pl = await loadPlayer({ needSeat: true });
  const me = pl.profile.id;
  const { data } = await pl.db
    .from("dm_threads")
    .select("id, a, b, requested_by, accepted_at, last_at, read_a, read_b, dm_messages(body, user_id, created_at)")
    .or(`a.eq.${me},b.eq.${me}`)
    .order("last_at", { ascending: false });
  const threads = (data ?? []) as Thread[];
  const otherIds = threads.map((t) => (t.a === me ? t.b : t.a));
  const { data: people } = otherIds.length
    ? await pl.db.from("profiles").select("id, first_name, photo_path").in("id", otherIds)
    : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id as string, p as { first_name: string; photo_path: string }]));
  const urls = await photoUrls(pl.db, (people ?? []).map((p) => p.photo_path as string));

  const incoming = threads.filter((t) => !t.accepted_at && t.requested_by !== me);
  const rest = threads.filter((t) => !incoming.includes(t));

  const row = (t: Thread) => {
    const other = who.get(t.a === me ? t.b : t.a);
    const last = [...t.dm_messages].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
    const read = t.a === me ? t.read_a : t.read_b;
    const unread = !!last && last.user_id !== me && (!read || new Date(last.created_at) > new Date(read));
    return (
      <li key={t.id}>
        <Link href={`/circle/dms/${t.id}`} className={unread ? "thread unread" : "thread"}>
          <Avatar src={other ? urls.get(other.photo_path) : undefined} name={other?.first_name ?? ""} size={48} />
          <span className="thread-main">
            <span className="guy-name">{other?.first_name ?? "Someone"}</span>
            <span className="fine thread-last">
              {!t.accepted_at && t.requested_by === me
                ? "Waiting for him to say yes"
                : last
                  ? `${last.user_id === me ? "You: " : ""}${last.body ?? "📷 Media"}`
                  : "Say hi"}
            </span>
          </span>
          <span className="fine">{timeAgo(t.last_at)}</span>
        </Link>
      </li>
    );
  };

  return (
    <Shell pl={pl}>
      <h1 className="game-h1">DMs</h1>
      <p className="fine">Only guys in your Circle can message you. Start one from any guy&apos;s page.</p>
      {incoming.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2 className="admin-h3">Wants to talk</h2>
          <ul className="thread-list">{incoming.map(row)}</ul>
        </section>
      )}
      <section style={{ marginTop: 20 }}>
        <ul className="thread-list">{rest.map(row)}</ul>
        {rest.length === 0 && incoming.length === 0 && (
          <p className="fine">
            No DMs yet. Find someone in <Link href="/circle/guys">Guys</Link> and say hi.
          </p>
        )}
      </section>
    </Shell>
  );
}
