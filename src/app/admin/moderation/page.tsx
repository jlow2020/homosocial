import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { aiEnabled } from "@/lib/moderation/ai";
import { when } from "../util";
import Decide from "./Decide";

type Item = {
  id: string;
  created_at: string;
  user_id: string;
  surface: string;
  content: string | null;
  media_bucket: string | null;
  media_path: string | null;
  verdict: "held" | "flagged" | "veiled";
  category: string | null;
  reason: string | null;
  urgent: boolean;
  detail: { ai?: { why?: string; confidence?: number; violation?: boolean }; match?: string; scores?: { porn?: number; sexy?: number } } | null;
  status: string;
  decided_at: string | null;
};

const WHERE: Record<string, string> = {
  answer: "Drop answer",
  reply: "Reply",
  lounge: "Lounge",
  plan: "Plan",
  rose: "Rose",
  dm: "DM",
  profile: "Profile",
  profile_photo: "Profile photo",
  video: "Video answer",
  drop_bank: "Drop he wrote",
};
const VERDICT: Record<string, string> = { held: "Held, only he sees it", veiled: "Posted behind tap-to-see", flagged: "Posted, flagged for a glance" };

export default async function Moderation() {
  const { db } = await requireAdmin();
  const [{ data: pending }, { data: done }] = await Promise.all([
    db.from("mod_queue").select("*").eq("status", "pending").order("urgent", { ascending: false }).order("created_at", { ascending: true }).limit(200),
    db.from("mod_queue").select("*").neq("status", "pending").order("decided_at", { ascending: false }).limit(30),
  ]);
  const items = (pending ?? []) as Item[];
  const ids = [...new Set([...items, ...((done ?? []) as Item[])].map((i) => i.user_id))];
  const { data: people } = ids.length ? await db.from("profiles").select("id, first_name").in("id", ids) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id as string, p.first_name as string]));
  const urls = new Map<string, string>();
  for (const bucket of ["photos", "clips"]) {
    const paths = items.filter((i) => i.media_bucket === bucket && i.media_path).map((i) => i.media_path as string);
    if (paths.length) {
      const { data } = await db.storage.from(bucket).createSignedUrls(paths, 3600);
      for (const s of data ?? []) if (s.path && s.signedUrl) urls.set(`${bucket}:${s.path}`, s.signedUrl);
    }
  }

  return (
    <div className="admin-stack">
      <section>
        <h2 className="admin-h2">Moderation</h2>
        <p className="admin-sub">
          The filter never deletes anything and never gives strikes. Held posts wait here, visible only to the guy who posted them. Approve and they post with no mark on him. Strikes only come from you: 1 is a warning, 2 in 90 days is a 7-day pause, 3 pauses him until you look.
          {aiEnabled() ? " AI second opinion is on." : " AI second opinion is off. Add ANTHROPIC_API_KEY in Railway to cut false alarms."}
        </p>
      </section>

      <section>
        <h3 className="admin-h3">Waiting on you ({items.length})</h3>
        {items.length === 0 && <p className="admin-sub">Nothing to look at. Go study.</p>}
        <ul className="alist mod-list">
          {items.map((i) => {
            const src = i.media_bucket && i.media_path ? urls.get(`${i.media_bucket}:${i.media_path}`) : undefined;
            return (
              <li key={i.id} className={i.urgent ? "mod-item urgent" : "mod-item"}>
                <div className="mod-meta">
                  {i.urgent && <span className="pill pill-hot">Urgent</span>}
                  <span className="pill pill-plain">{WHERE[i.surface] ?? i.surface}</span>
                  <span className="pill pill-plain">{VERDICT[i.verdict]}</span>
                  <Link href={`/admin/members/${i.user_id}`}>{name.get(i.user_id) ?? "Someone"}</Link>
                  <span className="admin-sub">{when(i.created_at)}</span>
                </div>
                <p className="mod-reason">
                  <b>{i.reason ?? i.category}</b>
                  {i.detail?.match && <span className="admin-sub"> · matched &ldquo;{i.detail.match}&rdquo;</span>}
                  {i.detail?.ai?.why && <span className="admin-sub"> · AI: {i.detail.ai.why}</span>}
                </p>
                {i.content && <p className="mod-content">{i.content}</p>}
                {src && (i.media_bucket === "clips" ? <video src={src} controls playsInline preload="metadata" className="mod-media" /> : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="mod-media" />
                ))}
                <Decide id={i.id} verdict={i.verdict} />
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="admin-h3">Recently handled</h3>
        <ul className="alist">
          {((done ?? []) as Item[]).map((i) => (
            <li key={i.id} className="admin-sub">
              {when(i.decided_at)} · {name.get(i.user_id) ?? "Someone"} · {WHERE[i.surface] ?? i.surface} · {i.reason ?? i.category} · <b>{i.status}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
