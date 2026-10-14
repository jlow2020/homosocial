import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuth, siteOrigin } from "@/lib/supabase-server";

// Sign-in links and Google both land here, then go to the next step.
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.headers);
  const code = request.nextUrl.searchParams.get("code");
  const auth = await getSupabaseAuth();
  if (!code || !auth) return NextResponse.redirect(`${origin}/join?error=link`);

  const { error } = await auth.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/join?error=link`);
  return NextResponse.redirect(`${origin}/me`);
}
