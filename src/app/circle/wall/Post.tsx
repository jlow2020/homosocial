import Link from "next/link";
import Veil from "../week/[n]/Veil";
import { Avatar, GuyName, timeAgo } from "../ui";
import type { Player } from "@/lib/game/player";
import type { WallComment, WallMedia, WallPost } from "./data";
import { DeleteButton, LikeButton } from "./WallButtons";
import WallComposer from "./WallComposer";

function Media({ m }: { m: WallMedia | null }) {
  if (!m) return null;
  if (m.kind === "video" && !m.ready) return <p className="converting">⏳ Getting the video ready. A minute, tops.</p>;
  if (!m.url) return null;
  if (m.veiled) return <Veil src={m.url} kind={m.kind} />;
  return m.kind === "video" ? (
    <video src={m.url} controls playsInline preload="metadata" className="wall-media" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.url} alt="" className="wall-media" loading="lazy" />
  );
}

function Comment({ pl, c, avatars }: { pl: Player; c: WallComment; avatars: Map<string, string> }) {
  const guy = pl.members.find((m) => m.id === c.user_id);
  const mine = c.user_id === pl.profile.id;
  return (
    <li className="wall-comment">
      <Avatar src={guy ? avatars.get(guy.photo_path ?? "") : undefined} name={guy?.first_name ?? ""} size={30} />
      <div className="wall-comment-body">
        <div className="wall-bubble">
          <GuyName pl={pl} m={guy} />
          {c.body && <p>{c.body}</p>}
          <Media m={c.media} />
          {c.held && <p className="fine">Waiting on a quick look. Only you can see this.</p>}
        </div>
        <div className="wall-meta">
          <span>{timeAgo(c.created_at)}</span>
          {!pl.closed && <LikeButton id={c.id} liked={c.liked} count={c.likes} comment />}
          {pl.closed && c.likes > 0 && <span>❤️ {c.likes}</span>}
          {mine && !pl.past && <DeleteButton kind="comment" id={c.id} />}
        </div>
      </div>
    </li>
  );
}

export default function Post({ pl, p, avatars, full = false }: { pl: Player; p: WallPost; avatars: Map<string, string>; full?: boolean }) {
  const guy = pl.members.find((m) => m.id === p.user_id);
  const mine = p.user_id === pl.profile.id;
  const hidden = p.commentCount - p.comments.length;
  return (
    <article className="wall-post">
      <header className="wall-head">
        <Avatar src={guy ? avatars.get(guy.photo_path ?? "") : undefined} name={guy?.first_name ?? ""} size={40} />
        <div>
          <GuyName pl={pl} m={guy} />
          <p className="wall-when">
            {full ? timeAgo(p.created_at) : <Link href={`/circle/wall/${p.id}`}>{timeAgo(p.created_at)}</Link>}
          </p>
        </div>
        {mine && !pl.past && <DeleteButton kind="post" id={p.id} after={full ? "/circle/wall" : undefined} />}
      </header>
      {p.body && <p className="wall-text">{p.body}</p>}
      <Media m={p.media} />
      {p.held && <p className="fine">Waiting on a quick look before the Circle sees it. Only you can see this.</p>}
      <div className="wall-actions">
        {!pl.closed ? <LikeButton id={p.id} liked={p.liked} count={p.likes} /> : <span>❤️ {p.likes}</span>}
        <Link href={`/circle/wall/${p.id}`} className="wall-count">
          💬 {p.commentCount > 0 ? `${p.commentCount} ${p.commentCount === 1 ? "comment" : "comments"}` : "Comment"}
        </Link>
      </div>
      {hidden > 0 && (
        <Link href={`/circle/wall/${p.id}`} className="wall-more">
          View all {p.commentCount} comments
        </Link>
      )}
      {p.comments.length > 0 && (
        <ul className="wall-comments">
          {p.comments.map((c) => (
            <Comment key={c.id} pl={pl} c={c} avatars={avatars} />
          ))}
        </ul>
      )}
      {!pl.closed && <WallComposer postId={p.id} placeholder="Write a comment" />}
    </article>
  );
}
