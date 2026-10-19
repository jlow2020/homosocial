import { TAGS, TAG_BY_SLUG, tagsInText, GROUP_LABEL } from "./catalog";

// Tag suggestions that fit one guy, recomputed every time he taps. No AI and
// no preset "gay starter pack": the order comes from his own words, what he's
// picked so far, what goes with it, and what real guys pick together.

export type Community = {
  circle: Record<string, number>; // tag -> how many guys in his Circle have it
  pairs: Record<string, Record<string, number>>; // tag -> tags real guys picked alongside it
  custom: { slug: string; label: string; uses: number }[]; // member-made tags that caught on
};

export type Suggestion = { slug: string; label: string; why: string };

function rand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
    return h / 4294967296;
  };
}

export function labelOf(slug: string, community?: Community): string {
  return TAG_BY_SLUG.get(slug)?.label ?? community?.custom.find((c) => c.slug === slug)?.label ?? slug.replace(/^c-/, "").replace(/-/g, " ");
}

export function suggest(opts: { selected: string[]; text: string; community: Community; seed: string; limit?: number }): Suggestion[] {
  const { selected, text, community, seed } = opts;
  const limit = opts.limit ?? 18;
  const have = new Set(selected);
  const score = new Map<string, { s: number; why: string; whyScore: number }>();
  const add = (slug: string, s: number, why: string) => {
    if (have.has(slug)) return;
    const cur = score.get(slug) ?? { s: 0, why, whyScore: 0 };
    cur.s += s;
    if (s > cur.whyScore) {
      cur.why = why;
      cur.whyScore = s;
    }
    score.set(slug, cur);
  };

  // 1. His own words.
  for (const slug of tagsInText(text)) add(slug, 10, "From what you wrote");

  // 2. What goes with what he's picked: written links, then same-group neighbors.
  for (const s of selected) {
    const t = TAG_BY_SLUG.get(s);
    if (!t) continue;
    for (const r of t.related) add(r, 4, `Goes with ${t.label}`);
    for (const sib of TAGS.filter((x) => x.group === t.group && x.slug !== s)) add(sib.slug, 0.6, `More ${GROUP_LABEL[t.group].toLowerCase()}`);
  }

  // 3. What real guys who share his tags also picked.
  for (const s of selected) {
    const pairs = community.pairs[s] ?? {};
    const total = Object.values(pairs).reduce((a, b) => a + b, 0) || 1;
    for (const [other, n] of Object.entries(pairs)) add(other, 5 * (n / total) + Math.min(2, n * 0.3), `Guys into ${labelOf(s, community)} pick this`);
  }

  // 4. His Circle.
  for (const [slug, n] of Object.entries(community.circle)) add(slug, Math.min(3, 0.8 * n), n === 1 ? "Someone in your Circle" : `${n} guys in your Circle`);

  // 5. Member-made tags that caught on.
  for (const c of community.custom) add(c.slug, Math.min(2.5, 0.4 * c.uses), "Made by members");

  const ranked = [...score.entries()].sort((a, b) => b[1].s - a[1].s);
  const out: Suggestion[] = ranked.slice(0, Math.max(0, limit - 4)).map(([slug, v]) => ({ slug, label: labelOf(slug, community), why: v.why }));

  // 6. Always leave room for something he hasn't thought of, from a group
  // he hasn't touched yet, different for every guy.
  const r = rand(seed + ":" + selected.length);
  const touched = new Set([...selected, ...out.map((o) => o.slug)].map((s) => TAG_BY_SLUG.get(s)?.group).filter(Boolean));
  const fresh = Object.keys(GROUP_LABEL).filter((g) => !touched.has(g)).sort(() => r() - 0.5);
  for (const g of fresh) {
    if (out.length >= limit) break;
    const pool = TAGS.filter((t) => t.group === g && !have.has(t.slug));
    const pick = pool[Math.floor(r() * pool.length)];
    if (pick) out.push({ slug: pick.slug, label: pick.label, why: "Something different" });
  }
  // Fill any gap from the ranked list.
  for (const [slug, v] of ranked.slice(out.length)) {
    if (out.length >= limit) break;
    if (!out.some((o) => o.slug === slug)) out.push({ slug, label: labelOf(slug, community), why: v.why });
  }
  return out.slice(0, limit);
}

// Typing in the search box: catalog tags and member-made ones.
export function search(q: string, selected: string[], community: Community): Suggestion[] {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  const have = new Set(selected);
  const hits = TAGS.filter((x) => !have.has(x.slug) && x.aliases.some((a) => a.includes(t))).map((x) => ({ slug: x.slug, label: x.label, why: GROUP_LABEL[x.group] }));
  const custom = community.custom.filter((c) => !have.has(c.slug) && c.label.toLowerCase().includes(t)).map((c) => ({ slug: c.slug, label: c.label, why: "Made by members" }));
  return [...hits, ...custom].slice(0, 12);
}
