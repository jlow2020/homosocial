import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { UUID } from "@/lib/admin";
import { acceptDm, declineDm, sendDm } from "../../game-actions";
import { Avatar, GuyName, Shell, timeAgo } from "../../ui";
import Composer from "../../Composer";
import Live from "../../Live";
import AcceptButton from "./AcceptButton";

export const dynamic = "force-dynamic";

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const pl = await loadPlayer({ needSeat: true });
  const me = pl.profile.id;
  const { data: t } = await pl.db.from("dm_threads").select("*").eq("id", id).maybeSingle();
  if (!t || (t.a !== me && t.b !== me)) notFound();
  const otherId = t.a === me ? t.b : t.a;
  const [{ data: msgs }, { data: otherRow }] = await Promise.all([
    pl.db.from("dm_messages").select("id, user_id, body, created_at").eq("thread_id", id).order("created_at"),
    pl.db.from("profiles").select("id, first_name, birthdate, interests, hot_take, photo_path, looking_for, is_demo, email").eq("id", otherId).single(),
  ]);
  const other = pl.members.find((m) => m.id === otherId) ?? (otherRow as (typeof pl.members)[number]);
  const urls = await photoUrls(pl.db, [other.photo_path]);
  const incoming = !t.accepted_at && t.requested_by !== me;
  const waiting = !t.accepted_at && t.requested_by === me;

  return (
    <Shell pl={pl}>
      <Live />
      <div className="chat">
        <div className="dm-head">
          <Link href="/circle/dms" className="fine">
            ← DMs
          </Link>
          <Avatar src={urls.get(other.photo_path)} name={other.first_name} size={44} />
          <GuyName pl={pl} m={other} age />
        </div>
        <ul className="chat-list">
          {(msgs ?? []).map((m) => (
            <li key={m.id} className={m.user_id === me ? "msg msg-mine" : "msg"}>
              <div className="msg-body">
                <p className="bubble">{m.body}</p>
                <span className="fine msg-time">{timeAgo(m.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
        {incoming ? (
          <div className="dm-request">
            <p>
              <b>{other.first_name}</b> wants to DM you. Say yes and you can both talk. Say no and he won&apos;t be told.
            </p>
            <div className="row">
              <AcceptButton threadId={id} accept={acceptDm} />
              <form action={declineDm.bind(null, id)}>
                <button className="link-button quiet">No thanks</button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {waiting && (msgs ?? []).length > 0 && <p className="fine">Sent. You can keep talking once he says yes.</p>}
            <Composer
              send={sendDm.bind(null, id)}
              placeholder={waiting && (msgs ?? []).length === 0 ? "Say hi. One message until he says yes." : `Message ${other.first_name}`}
              disabled={waiting && (msgs ?? []).length > 0}
            />
          </>
        )}
      </div>
    </Shell>
  );
}
