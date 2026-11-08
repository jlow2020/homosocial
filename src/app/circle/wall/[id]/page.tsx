import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadPlayer, photoUrls } from "@/lib/game/player";
import { UUID } from "@/lib/admin";
import { Shell } from "../../ui";
import Live from "../../Live";
import Post from "../Post";
import { loadWall } from "../data";

export const dynamic = "force-dynamic";

export default async function WallPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const pl = await loadPlayer({ needSeat: true });
  if (pl.waiting) redirect("/circle");
  const [post] = await loadWall(pl, { postId: id });
  if (!post) notFound();
  const avatars = await photoUrls(pl.db, pl.members.map((m) => m.photo_path));
  return (
    <Shell pl={pl}>
      <Live every={10000} />
      <div className="wall">
        <Link href="/circle/wall" className="link-button quiet">
          ‹ The Wall
        </Link>
        <Post pl={pl} p={post} avatars={avatars} full />
      </div>
    </Shell>
  );
}
