import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { identitiesIn, identityDistance } from "@/lib/server/vision";

// Same bar the ID check uses: real matches land under it ~92% of the time,
// strangers well under 1%. Two ordinary photos are easier than an ID photo.
const MAX_DISTANCE = 0.52;

// Is the face in a new photo the same guy as in his current profile photo?
// "unknown" when either photo has no clear face or the models can't run.
export async function samePerson(db: SupabaseClient, oldPath: string, next: Buffer): Promise<"same" | "different" | "unknown"> {
  try {
    const { data } = await db.storage.from("photos").download(oldPath);
    if (!data) return "unknown";
    const [before, after] = await Promise.all([
      identitiesIn(Buffer.from(await data.arrayBuffer()), 1024),
      identitiesIn(next, 1024),
    ]);
    if (!before[0] || !after[0]) return "unknown";
    const d = await identityDistance(before[0], after[0]);
    console.log("photo swap face distance", d.toFixed(3));
    return d <= MAX_DISTANCE ? "same" : "different";
  } catch (e) {
    console.error("samePerson failed", e);
    return "unknown";
  }
}
