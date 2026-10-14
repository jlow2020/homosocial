import { NextResponse } from "next/server";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";

// Your own profile photo, same-origin, so the Realness Check can read it.
export async function GET() {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me?.profile?.photo_path || !db) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { data, error } = await db.storage.from("photos").download(me.profile.photo_path);
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(data, {
    headers: { "Content-Type": data.type || "image/jpeg", "Cache-Control": "private, no-store" },
  });
}
