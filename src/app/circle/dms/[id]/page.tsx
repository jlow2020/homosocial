import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { UUID } from "@/lib/admin";
import { acceptDm, declineDm } from "../../game-actions";
import { Avatar, GuyName, Shell } from "../../ui";
import Live from "../../Live";
import AcceptButton from "./AcceptButton";
import { PhotoSwitch } from "./DmPhotos";
import ChatThread, { type ChatMessage } from "./ChatThread";
import BlindReveal from "./BlindReveal";
import { ageFrom } from "@/lib/season";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  user_id: string;
  body: string | null;
  photo_path: string | null;
  media_type: "photo" | "video" | null;
  ready: boolean;
  created_at: string;
  dm_reactions: { user_id: string; emoji: string }[];
};

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const pl = await loadPlayer({ needSeat: true });
  const me = pl.profile.id;
  const { data: t } = await pl.db.from("dm_threads").select("*").eq("id", id).maybeSingle();
  if (!t || (t.a !== me && t.b !== me)) notFound();
  const amA = t.a === me;
  const otherId = amA ? t.b : t.a;

  // Opening the chat marks it read.
  await pl.db.from("dm_threads").update({ [amA ? "read_a" : "read_b"]: new Date().toISOString() }).eq("id", id);

  const [{ data: rows }, { data: otherRow }] = await Promise.all([
    pl.db
      .from("dm_messages")
      .select("id, user_id, body, photo_path, media_type, ready, created_at, dm_reactions(user_id, emoji)")
      .eq("thread_id", id)
      .order("created_at"),
    pl.db
      .from("profiles")
      .select("id, first_name, birthdate, interests, hot_take, photo_path, looking_for, is_demo, email, founder_no")
      .eq("id", otherId)
      .single(),
  ]);
  const other = pl.members.find((m) => m.id === otherId) ?? (otherRow as (typeof pl.members)[number]);
  const msgs = (rows ?? []) as Row[];

  const photoPaths = msgs.filter((m) => m.photo_path && m.media_type !== "video").map((m) => m.photo_path);
  const clipPaths = msgs.filter((m) => m.photo_path && m.media_type === "video").map((m) => m.photo_path as string);
  const [urls, clips] = await Promise.all([
    photoUrls(pl.db, [other.photo_path, ...photoPaths]),
    clipPaths.length
      ? pl.db.storage.from("clips").createSignedUrls(clipPaths, 3600).then((r) => new Map((r.data ?? []).map((x) => [x.path as string, x.signedUrl as string])))
      : Promise.resolve(new Map<string, string>()),
  ]);

  const messages: ChatMessage[] = msgs.map((m) => ({
    id: m.id,
    mine: m.user_id === me,
    body: m.body,
    media: m.photo_path
      ? { type: m.media_type === "video" ? "video" : "photo", url: m.ready === false ? null : ((m.media_type === "video" ? clips : urls).get(m.photo_path) ?? null), converting: m.ready === false }
      : null,
    at: m.created_at,
    reactions: m.dm_reactions.map((r) => ({ emoji: r.emoji, mine: r.user_id === me })),
  }));

  const blind = !!t.blind_until && new Date(t.blind_until) > new Date();
  // After the reveal both have to say Keep talking before the chat reopens.
  const revealPending = !!t.blind_until && !blind && !(t.keep_a && t.keep_b);
  const iKept = amA ? !!t.keep_a : !!t.keep_b;
  const heKept = amA ? !!t.keep_b : !!t.keep_a;
  const mineOn = !blind && (amA ? t.photos_a : t.photos_b);
  const theirsOn = !blind && (amA ? t.photos_b : t.photos_a);
  const myUrl = (await photoUrls(pl.db, [pl.profile.photo_path])).get(pl.profile.photo_path) ?? null;
  const seenAt = (amA ? t.read_b : t.read_a) as string | null;
  const incoming = !t.accepted_at && t.requested_by !== me;
  const waiting = !t.accepted_at && t.requested_by === me;

  return (
    <Shell pl={pl}>
      <Live every={3000} />
      <div className="dm">
        <div className="dm-top">
          <Link href="/circle/dms" className="dm-back" aria-label="All DMs">
            ‹
          </Link>
          {blind ? <span className="avatar anon-mask" style={{ width: 44, height: 44 }}>💘</span> : <Avatar src={urls.get(other.photo_path)} name={other.first_name} size={44} />}
          <div className="dm-top-name">
            {blind ? <span className="guy-name">Your blind date</span> : <GuyName pl={pl} m={other} age />}
            <span className="fine">{blind ? `Names and faces come out ${new Date(t.blind_until).toLocaleDateString("en-US", { weekday: "long" })}` : t.accepted_at ? (mineOn && theirsOn ? "Photos and videos on" : "In your Circle") : "Message request"}</span>
          </div>
        </div>

        <ChatThread
          threadId={id}
          otherId={otherId}
          messages={messages}
          otherName={blind ? "your date" : other.first_name}
          otherPhoto={blind ? null : (urls.get(other.photo_path) ?? null)}
          seenAt={seenAt}
          media={!!t.accepted_at && !blind && mineOn && theirsOn}
          canSend={!incoming && !revealPending && !(waiting && messages.length > 0)}
          waiting={waiting}
          footer={
            incoming ? (
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
            ) : blind ? (
              <p className="fine">💘 Blind Date. Photos and videos stay off until the reveal.</p>
            ) : revealPending ? (
              <BlindReveal
                threadId={id}
                me={{ name: pl.profile.first_name, photo: myUrl, age: ageFrom(pl.profile.birthdate) }}
                him={{ name: other.first_name, photo: urls.get(other.photo_path) ?? null, age: ageFrom(other.birthdate) }}
                iKept={iKept}
                heKept={heKept}
              />
            ) : t.accepted_at ? (
              <PhotoSwitch threadId={id} mine={mineOn} theirs={theirsOn} name={other.first_name} />
            ) : null
          }
        />
      </div>
    </Shell>
  );
}
