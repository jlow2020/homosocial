import { redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { Shell } from "../ui";
import Live from "../Live";
import WallComposer from "./WallComposer";
import Post from "./Post";
import { loadWall } from "./data";

export const dynamic = "force-dynamic";

export default async function Wall() {
  const pl = await loadPlayer({ needSeat: true });
  if (pl.waiting) redirect("/circle");
  const posts = await loadWall(pl, { limit: 40, previewComments: 2 });
  const avatars = await photoUrls(pl.db, pl.members.map((m) => m.photo_path));
  return (
    <Shell pl={pl}>
      <Live every={15000} />
      <div className="wall">
        <h1 className="game-h1">The Wall</h1>
        {pl.closed ? (
          <p className="fine">This Season is over, so the Wall is read-only.</p>
        ) : (
          <div className="wall-post wall-new">
            <WallComposer placeholder={`What's up, ${pl.profile.first_name}?`} />
          </div>
        )}
        {posts.length === 0 && <p className="fine wall-empty">Nothing yet. Be the first.</p>}
        {posts.map((p) => (
          <Post key={p.id} pl={pl} p={p} avatars={avatars} />
        ))}
      </div>
    </Shell>
  );
}
