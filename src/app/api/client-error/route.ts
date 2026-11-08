import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";

// Phones report crashes here so they can be found and fixed. Kept small.
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > 8000) return new Response(null, { status: 413 });
    const b = JSON.parse(raw) as Record<string, unknown>;
    const s = (k: string, n: number) => String(b[k] ?? "").slice(0, n);
    const db = getSupabaseAdmin();
    if (!db) return new Response(null, { status: 204 });
    const me = await getMe().catch(() => null);
    await db.from("admin_log").insert({
      action: "client:error",
      target: me?.profile?.id ?? null,
      detail: { message: s("message", 400), digest: s("digest", 60), stack: s("stack", 1500), path: s("path", 200), ua: req.headers.get("user-agent")?.slice(0, 200) ?? "", reloaded: !!b.reloaded },
    });
  } catch {
    // never fail the page over this
  }
  return new Response(null, { status: 204 });
}
