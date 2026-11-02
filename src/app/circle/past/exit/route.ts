import { NextResponse, type NextRequest } from "next/server";
import { PAST_COOKIE } from "@/lib/game/player";
import { siteOrigin } from "@/lib/supabase-server";

// Back to his current Circle.
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(`${siteOrigin(request.headers)}/circle`);
  res.cookies.delete(PAST_COOKIE);
  return res;
}
