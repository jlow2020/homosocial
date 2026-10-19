import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Member } from "./player";

export type Chemistry = {
  agreed?: { id: string; n: number; of: number }; // This or That: picked the same side most
  dmd?: { id: string; n: number }; // most messages back and forth
  reactedToYou?: { id: string; n: number }; // reacted to your answers most
  youReacted?: { id: string; n: number }; // whose answers you reacted to most
  guessedYou?: { id: string; n: number }; // guessed your anonymous answers right most
  datesWith?: string[]; // blind dates
};

// Private, shown to each guy right before his picks: the numbers behind the chemistry.
export async function chemistryFor(db: SupabaseClient, circle: { id: string; season_no: number }, meId: string, members: Member[]): Promise<Chemistry> {
  const ids = new Set(members.map((m) => m.id));
  const out: Chemistry = {};
  const { data: drops } = await db.from("drops").select("id, mode, spec").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const dropIds = (drops ?? []).map((d) => d.id as string);
  if (!dropIds.length) return out;
  const { data: answers } = await db.from("answers").select("id, drop_id, user_id, data, reactions(user_id)").in("drop_id", dropIds).eq("passed", false);
  const rows = (answers ?? []) as { id: string; drop_id: string; user_id: string; data: Record<string, unknown> | null; reactions: { user_id: string }[] }[];

  // This or That agreement.
  const totDrops = (drops ?? []).filter((d) => (d.spec as { kind?: string } | null)?.kind === "thisorthat");
  const agree = new Map<string, number>();
  let pairs = 0;
  for (const d of totDrops) {
    const mine = rows.find((a) => a.drop_id === d.id && a.user_id === meId)?.data?.picks as number[] | undefined;
    if (!mine) continue;
    pairs += mine.length;
    for (const a of rows.filter((x) => x.drop_id === d.id && x.user_id !== meId && ids.has(x.user_id))) {
      const p = a.data?.picks as number[] | undefined;
      if (!p) continue;
      agree.set(a.user_id, (agree.get(a.user_id) ?? 0) + mine.filter((v, i) => p[i] === v).length);
    }
  }
  const top = (m: Map<string, number>, min = 1) => {
    const e = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    return e && e[1] >= min ? { id: e[0], n: e[1] } : undefined;
  };
  const ag = top(agree, 2);
  if (ag) out.agreed = { ...ag, of: pairs };

  // Reactions each way.
  const toMe = new Map<string, number>();
  const byMe = new Map<string, number>();
  for (const a of rows) {
    if (a.user_id === meId) for (const r of a.reactions) if (ids.has(r.user_id)) toMe.set(r.user_id, (toMe.get(r.user_id) ?? 0) + 1);
    else if (ids.has(a.user_id) && a.reactions.some((r) => r.user_id === meId)) byMe.set(a.user_id, (byMe.get(a.user_id) ?? 0) + 1);
  }
  out.reactedToYou = top(toMe, 2);
  out.youReacted = top(byMe, 2);

  // Who read you best: right guesses on your anonymous answers.
  const myAnon = rows.filter((a) => a.user_id === meId).map((a) => a.id);
  if (myAnon.length) {
    const { data: g } = await db.from("guesses").select("guesser, answer_id, guessed").in("answer_id", myAnon).eq("guessed", meId);
    const m = new Map<string, number>();
    for (const x of g ?? []) if (ids.has(x.guesser)) m.set(x.guesser, (m.get(x.guesser) ?? 0) + 1);
    out.guessedYou = top(m, 1);
  }

  // DMs.
  const { data: threads } = await db.from("dm_threads").select("id, a, b, blind_drop, dm_messages(user_id)").or(`a.eq.${meId},b.eq.${meId}`).not("accepted_at", "is", null);
  const dm = new Map<string, number>();
  const dates: string[] = [];
  for (const t of (threads ?? []) as { id: string; a: string; b: string; blind_drop: string | null; dm_messages: { user_id: string }[] }[]) {
    const other = t.a === meId ? t.b : t.a;
    if (!ids.has(other)) continue;
    if (t.dm_messages.length) dm.set(other, t.dm_messages.length);
    if (t.blind_drop && dropIds.includes(t.blind_drop)) dates.push(other);
  }
  out.dmd = top(dm, 6);
  if (dates.length) out.datesWith = dates;
  return out;
}
