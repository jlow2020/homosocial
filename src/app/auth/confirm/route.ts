import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseAuth, siteOrigin } from "@/lib/supabase-server";

// Email sign-in links land here. Unlike /auth/callback, this works no matter
// which browser or device opens the link, because it doesn't depend on a
// cookie from the browser that asked for it.
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.headers);
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = (params.get("type") ?? "email") as EmailOtpType;
  const auth = await getSupabaseAuth();
  if (!tokenHash || !auth) return NextResponse.redirect(`${origin}/join?error=link`);

  const { error } = await auth.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(`${origin}/join?error=link`);
  return NextResponse.redirect(type === "recovery" ? `${origin}/account?reset=1` : `${origin}/me`);
}
