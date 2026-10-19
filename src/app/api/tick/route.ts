import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { tickAll } from "@/lib/game/tick";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The clock. GitHub Actions calls this every 10 minutes. Everything it does
// happens once per Circle, so an extra call changes nothing.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(req.url).searchParams.get("key");
    if (got !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, error: "no database" }, { status: 500 });
  const out = await tickAll(db);
  return NextResponse.json({ ok: true, ...out });
}
