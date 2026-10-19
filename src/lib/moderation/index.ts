import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notify";
import { checkText, needsCare, type Surface, type TextHit } from "./text";
import { scoreImage, previewJpeg, type ImageScores } from "./image";
import { aiCheckImage, aiCheckText, aiEnabled } from "./ai";

// The moderation engine. Principles:
// 1. Ambiguous never blocks. A guy is only held up when we're sure.
// 2. Nothing is ever deleted by a machine. "Held" means waiting for a person,
//    and if the person says it's fine it posts with no mark on his account.
// 3. Strikes only come from a person, never from the filter.
// 4. Anything about minors or threats pings Daddy right away.

export type Decision = {
  action: "allow" | "flag" | "hold";
  category?: string;
  reason?: string;
  urgent?: boolean;
  care?: boolean; // he wrote something that sounds like he's hurting; show him where help is
  detail?: Record<string, unknown>;
};

export const HELD_NOTICE = "Held for a quick look before your Circle sees it. A person checks these, usually within a day. If it's fine, it posts with no mark on your account.";
export const CARE_NOTICE = "If you're going through it right now, you can call or text 988, any time. You don't have to be in crisis to reach out.";

export async function moderateText(text: string, surface: Surface): Promise<Decision> {
  const care = needsCare(text);
  const hit: TextHit | null = checkText(text, surface);
  if (!hit) return { action: "allow", care };
  const detail: Record<string, unknown> = { match: hit.match, level: hit.level };
  if (aiEnabled()) {
    const ai = await aiCheckText(text, surface, `${hit.category} (${hit.reason})`);
    if (ai) {
      detail.ai = ai;
      const yes = ai.violation && ai.confidence >= (hit.level === "clear" ? 0.5 : 0.8);
      const no = !ai.violation && ai.confidence >= 0.7;
      if (no) return { action: "allow", care, detail };
      if (yes) return { action: "hold", category: hit.category, reason: hit.reason, urgent: hit.urgent, care, detail };
    }
  }
  // No second opinion: hold only what the rules call clear.
  return { action: hit.level === "clear" ? "hold" : "flag", category: hit.category, reason: hit.reason, urgent: hit.urgent, care, detail };
}

// Photos in shared spaces. "veil" = posts, but blurred behind "tap to see" until a person looks.
export type ImageDecision = { action: "allow" | "veil" | "hold"; scores?: ImageScores; ai?: unknown; reason?: string };

export async function moderateImage(image: Buffer, where: string): Promise<ImageDecision> {
  let s: Awaited<ReturnType<typeof scoreImage>>;
  try {
    s = await scoreImage(image);
  } catch (e) {
    // If the checker breaks, let it through and have a person look.
    console.error("image check failed", e);
    return { action: "veil", reason: "Couldn't check this photo automatically" };
  }
  if (s.verdict === "allow") return { action: "allow", scores: s.scores };
  if (aiEnabled()) {
    const ai = await aiCheckImage(await previewJpeg(image), where);
    if (ai) {
      if (ai.violation && ai.confidence >= 0.6) return { action: "hold", scores: s.scores, ai, reason: `Nudity: ${ai.category}` };
      if (!ai.violation && ai.confidence >= 0.75) return { action: "allow", scores: s.scores, ai };
    }
  }
  return s.verdict === "explicit"
    ? { action: "hold", scores: s.scores, reason: "Looks explicit" }
    : { action: "veil", scores: s.scores, reason: "Might show more than the house rules allow" };
}

export type QueueItem = {
  user_id: string;
  circle_id?: string | null;
  surface: string; // answer, reply, lounge, plan, rose, dm, profile, profile_photo, video
  ref_table?: string | null;
  ref_id?: string | null;
  content?: string | null;
  media_bucket?: string | null;
  media_path?: string | null;
  verdict: "held" | "flagged" | "veiled";
  category?: string | null;
  reason?: string | null;
  urgent?: boolean;
  detail?: Record<string, unknown> | null;
};

export async function enqueue(db: SupabaseClient, item: QueueItem): Promise<void> {
  const { error } = await db.from("mod_queue").insert({ ...item, urgent: !!item.urgent, detail: item.detail ?? null });
  if (error) console.error("mod enqueue failed", error);
  if (item.urgent) {
    await alertAdmins(db, "🚨 Needs a look now", `${item.reason ?? item.category ?? "Flagged"} in ${item.surface}.`, "/admin/moderation");
  }
}

export async function alertAdmins(db: SupabaseClient, title: string, body: string, url: string): Promise<void> {
  const { data } = await db.from("admins").select("user_id");
  await notify(db, (data ?? []).map((a) => a.user_id as string), { title, body, url, tag: "mod", email: true });
}

export async function queueFor(db: SupabaseClient, d: Decision, item: Omit<QueueItem, "verdict" | "category" | "reason" | "urgent" | "detail">): Promise<void> {
  if (d.action === "allow") return;
  await enqueue(db, { ...item, verdict: d.action === "hold" ? "held" : "flagged", category: d.category, reason: d.reason, urgent: d.urgent, detail: d.detail });
}
