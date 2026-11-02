import { NextResponse, type NextRequest } from "next/server";
import { PAST_COOKIE } from "@/lib/game/player";
import { siteOrigin } from "@/lib/supabase-server";

// Look back at an old Circle. The player loader checks he was in it and that
// its Season is over; anything else just lands on his current Circle.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = NextResponse.redirect(`${siteOrigin(request.headers)}/circle`);
  if (/^[0-9a-f-]{36}$/i.test(id)) res.cookies.set(PAST_COOKIE, id, { path: "/", maxAge: 60 * 60, sameSite: "lax", httpOnly: true });
  return res;
}
