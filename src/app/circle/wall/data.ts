import "server-only";
import { photoUrls, type Player } from "@/lib/game/player";

export type WallMedia = { kind: "photo" | "video"; url: string | null; ready: boolean; veiled: boolean };
export type WallComment = { id: string; user_id: string; body: string | null; created_at: string; held: boolean; media: WallMedia | null; likes: number; liked: boolean };
export type WallPost = WallComment & { comments: WallComment[]; commentCount: number };

type Row = { id: string; user_id: string; body: string | null; photo_path: string | null; media_type: "photo" | "video" | null; ready: boolean; held: boolean; veiled: boolean; created_at: string };

// Posts (or one post) with likes, comments and signed media. Held items only show
// to the guy who wrote them; guys outside the Circle (or blocked) don't show at all.
export async function loadWall(pl: Player, opts: { postId?: string; limit?: number; previewComments?: number } = {}): Promise<WallPost[]> {
  const { db } = pl;
  const me = pl.profile.id;
  const allowed = new Set(pl.members.map((m) => m.id));
  let q = db.from("wall_posts").select("id, user_id, body, photo_path, media_type, ready, held, veiled, created_at").eq("circle_id", pl.circle.id);
  q = opts.postId ? q.eq("id", opts.postId) : q.order("created_at", { ascending: false }).limit(opts.limit ?? 40);
  const { data: postRows } = await q;
  const posts = ((postRows ?? []) as Row[]).filter((p) => allowed.has(p.user_id) && (!p.held || p.user_id === me));
  if (!posts.length) return [];
  const ids = posts.map((p) => p.id);

  const [{ data: commentRows }, { data: likeRows }] = await Promise.all([
    db.from("wall_comments").select("id, post_id, user_id, body, photo_path, media_type, ready, held, veiled, created_at").in("post_id", ids).order("created_at"),
    db.from("wall_likes").select("post_id, user_id").in("post_id", ids),
  ]);
  const comments = ((commentRows ?? []) as (Row & { post_id: string })[]).filter((c) => allowed.has(c.user_id) && (!c.held || c.user_id === me));
  const { data: cLikeRows } = comments.length
    ? await db.from("wall_comment_likes").select("comment_id, user_id").in("comment_id", comments.map((c) => c.id))
    : { data: [] as { comment_id: string; user_id: string }[] };

  const all = [...posts, ...comments];
  const photoMap = await photoUrls(db, all.filter((r) => r.media_type === "photo").map((r) => r.photo_path));
  const clipPaths = all.filter((r) => r.media_type === "video" && r.ready && r.photo_path).map((r) => r.photo_path as string);
  const clipMap = clipPaths.length
    ? new Map(((await db.storage.from("clips").createSignedUrls(clipPaths, 3600)).data ?? []).filter((x) => x.signedUrl).map((x) => [x.path as string, x.signedUrl as string]))
    : new Map<string, string>();

  const media = (r: Row): WallMedia | null =>
    r.photo_path && r.media_type
      ? { kind: r.media_type, url: (r.media_type === "photo" ? photoMap : clipMap).get(r.photo_path) ?? null, ready: r.ready, veiled: r.veiled && r.user_id !== me }
      : null;
  const count = <T,>(rows: T[] | null | undefined, key: (r: T) => string) => {
    const m = new Map<string, { n: number; mine: boolean }>();
    for (const r of rows ?? []) {
      const k = key(r);
      const cur = m.get(k) ?? { n: 0, mine: false };
      cur.n++;
      if ((r as { user_id: string }).user_id === me) cur.mine = true;
      m.set(k, cur);
    }
    return m;
  };
  const postLikes = count(likeRows, (r) => r.post_id as string);
  const commentLikes = count(cLikeRows, (r) => r.comment_id as string);

  const toComment = (c: Row): WallComment => ({
    id: c.id, user_id: c.user_id, body: c.body, created_at: c.created_at, held: c.held, media: media(c),
    likes: commentLikes.get(c.id)?.n ?? 0, liked: commentLikes.get(c.id)?.mine ?? false,
  });
  return posts.map((p) => {
    const mine = comments.filter((c) => c.post_id === p.id).map(toComment);
    const keep = opts.previewComments ?? Infinity;
    return {
      id: p.id, user_id: p.user_id, body: p.body, created_at: p.created_at, held: p.held, media: media(p),
      likes: postLikes.get(p.id)?.n ?? 0, liked: postLikes.get(p.id)?.mine ?? false,
      comments: mine.slice(Math.max(0, mine.length - keep)),
      commentCount: mine.length,
    };
  });
}
