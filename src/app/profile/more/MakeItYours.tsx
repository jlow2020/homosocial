"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VoiceRecorder from "@/components/VoiceRecorder";
import VideoRecorder from "@/components/VideoRecorder";
import Waveform from "@/components/Waveform";
import { shrinkImage } from "@/lib/image";
import { suggestDown, downLabel } from "@/lib/profile/downfor";
import { PROMPT_BY_ID, PROFILE_PROMPTS, STARTERS, PHOTO_THEMES, PRONOUNS, ZODIAC, RELATIONSHIP, VOICE_SCRIPTS } from "@/lib/profile/prompts";
import { suggest, search, labelOf, type Community } from "@/lib/profile/suggest";
import type { Extras } from "@/lib/profile/data";
import { STEP_KEYS, STEP_TITLES, type StepKey } from "@/lib/profile/steps";
import { addPhoto, addVideo, videoTicket, pinAnswer, removePhoto, removeVoice, saveAnswers, saveBasics, saveTags, setPhotoTheme, voiceTicket, saveVoice, promptPack, promptDrafts } from "./actions";

type Line = { id: string; body: string; fires: number; week: number; season: number; prompt: string };

const TITLES = STEP_TITLES;

export default function MakeItYours({
  extras,
  community,
  seedText,
  seed,
  lines,
  mainPhoto,
  startAt,
  finishHref,
}: {
  extras: Extras;
  community: Community;
  seedText: string;
  seed: string;
  lines: Line[];
  mainPhoto: string | null;
  startAt: StepKey | null;
  finishHref: string;
}) {
  const steps = STEP_KEYS.filter((k) => k !== "hit" || lines.length > 0);
  const [step, setStepRaw] = useState(Math.max(0, startAt ? steps.indexOf(startAt) : 0));
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [tags, setTags] = useState<string[]>(extras.interests);
  const router = useRouter();
  const last = step === steps.length - 1;

  const go = (n: number) => {
    if (n >= steps.length) {
      router.push(finishHref);
      return;
    }
    setDir(n >= step ? "fwd" : "back");
    setStepRaw(Math.max(0, n));
    router.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => go(step + 1);
  const key = steps[step];

  return (
    <div className="miy">
      <div className="miy-top">
        <button className="miy-back" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Back">
          ‹
        </button>
        <div className="miy-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label={`${TITLES[key]}, step ${step + 1} of ${steps.length}`}>
          <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <span className="miy-count">
          {step + 1}/{steps.length}
        </span>
      </div>
      <div key={key} className={`miy-pane ${dir}`}>
        {key === "into" && <Interests initial={tags} community={community} seedText={seedText} seed={seed} onNext={(t) => (setTags(t), next())} onSkip={next} />}
        {key === "down" && <DownFor tags={tags} initial={extras.down} onNext={next} />}
        {key === "prompts" && <Prompts initial={extras.answers} lines={lines} onNext={next} />}
        {key === "photos" && <Photos photos={extras.photos} mainPhoto={mainPhoto} onNext={next} />}
        {key === "voice" && <Voice url={extras.voiceUrl} converting={!extras.voiceReady} onNext={next} />}
        {key === "details" && <Details initial={extras.basics} onNext={next} last={last} />}
        {key === "hit" && <GreatestHit lines={lines} pinned={extras.pinned} onNext={next} />}
      </div>
    </div>
  );
}

function Footer({ pending, error, onSave, onSkip, label = "Next" }: { pending?: boolean; error?: string; onSave: () => void; onSkip?: () => void; label?: string }) {
  return (
    <div className="miy-foot">
      {error && <p className="error">{error}</p>}
      <div className="miy-foot-row">
        {onSkip ? (
          <button className="link-button quiet" onClick={onSkip}>
            Skip
          </button>
        ) : (
          <span />
        )}
        <button className="btn btn-pink" disabled={pending} onClick={onSave}>
          {pending ? "Saving..." : label}
        </button>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children, i }: { on?: boolean; onClick: () => void; children: React.ReactNode; i?: number }) {
  return (
    <li style={i === undefined ? undefined : ({ "--i": i } as React.CSSProperties)}>
      <button className={on ? "chip on" : "chip"} aria-pressed={!!on} onClick={onClick}>
        {children}
      </button>
    </li>
  );
}

// Into: suggestions rebuild on every tap.
function Interests({ initial, community, seedText, seed, onNext, onSkip }: { initial: string[]; community: Community; seedText: string; seed: string; onNext: (tags: string[]) => void; onSkip: () => void }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [custom, setCustom] = useState<{ slug: string; label: string }[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const ideas = useMemo(() => suggest({ selected: picked, text: seedText, community, seed, limit: 18 }), [picked, seedText, community, seed]);
  const found = useMemo(() => search(q, picked, community), [q, picked, community]);
  const label = (s: string) => custom.find((c) => c.slug === s)?.label ?? labelOf(s, community);
  const toggle = (s: string) => setPicked(picked.includes(s) ? picked.filter((x) => x !== s) : [...picked, s].slice(0, 25));

  const addOwn = () => {
    const l = q.trim();
    if (l.length < 2) return;
    start(async () => {
      const r = await saveTags("interest", picked, [l]);
      if (!r.ok) setError(r.error ?? "That didn't save.");
      else if (r.added?.length) {
        setCustom([...custom, ...r.added]);
        setPicked([...picked, ...r.added.map((a) => a.slug).filter((s) => !picked.includes(s))]);
        setQ("");
        setError("");
      }
    });
  };

  return (
    <section className="miy-card">
      <h2>What are you into?</h2>
      {picked.length > 0 && (
        <ul className="chips-pick picked" aria-label="Your picks">
          {picked.map((s) => (
            <li key={s} className="chip-in">
              <button className="chip on" onClick={() => toggle(s)} aria-label={`Remove ${label(s)}`}>
                {label(s)} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        className="input input-search"
        placeholder="Search or add"
        aria-label="Search or add your own"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), found[0] ? (toggle(found[0].slug), setQ("")) : addOwn())}
      />
      {q.trim().length >= 2 && (
        <ul className="chips-pick">
          {found.map((f) => (
            <Chip key={f.slug} onClick={() => (toggle(f.slug), setQ(""))}>
              {f.label}
            </Chip>
          ))}
          <li>
            <button className="chip chip-add" disabled={pending} onClick={addOwn}>
              + {q.trim()}
            </button>
          </li>
        </ul>
      )}
      <ul className="chips-pick ideas">
        {ideas.map((s, i) => (
          <Chip key={s.slug} i={i} onClick={() => toggle(s.slug)}>
            {s.label}
          </Chip>
        ))}
      </ul>
      <Footer
        pending={pending}
        error={error}
        onSkip={onSkip}
        onSave={() =>
          start(async () => {
            const r = await saveTags("interest", picked);
            if (!r.ok) setError(r.error ?? "That didn't save.");
            else onNext(picked);
          })
        }
      />
    </section>
  );
}

// Down for: a few for anybody, the rest from what he's into.
function DownFor({ tags, initial, onNext }: { tags: string[]; initial: string[]; onNext: () => void }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [limit, setLimit] = useState(18);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const options = useMemo(() => suggestDown(tags, initial, limit), [tags, initial, limit]);
  const more = suggestDown(tags, initial, limit + 1).length > options.length;
  const toggle = (s: string) => setPicked(picked.includes(s) ? picked.filter((x) => x !== s) : [...picked, s]);
  return (
    <section className="miy-card">
      <h2>What are you down for?</h2>
      <ul className="chips-pick ideas">
        {options.map((d, i) => (
          <Chip key={d.slug} i={i} on={picked.includes(d.slug)} onClick={() => toggle(d.slug)}>
            {downLabel(d.slug)}
          </Chip>
        ))}
        {more && (
          <li>
            <button className="chip chip-add" onClick={() => setLimit(limit + 12)}>
              More
            </button>
          </li>
        )}
      </ul>
      <Footer
        pending={pending}
        error={error}
        onSkip={onNext}
        onSave={() =>
          start(async () => {
            const r = await saveTags("down", picked);
            if (!r.ok) setError(r.error ?? "That didn't save.");
            else onNext();
          })
        }
      />
    </section>
  );
}

// Prompts: three picked for him, answers drafted from his picks.
function Prompts({ initial, lines, onNext }: { initial: { prompt_id: string; body: string }[]; lines: Line[]; onNext: () => void }) {
  const [chosen, setChosen] = useState<{ id: string; body: string; edited: boolean }[]>(initial.map((a) => ({ id: a.prompt_id, body: a.body, edited: true })));
  const [ranked, setRanked] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    const fallback = () => {
      const ids = PROFILE_PROMPTS.map((p) => p.id);
      return { ranked: ids, drafts: Object.fromEntries(ids.filter((id) => !initial.some((a) => a.prompt_id === id)).slice(0, 3 - initial.length).concat(initial.map((a) => a.prompt_id)).map((id) => [id, STARTERS[id] ?? []])) };
    };
    promptPack(initial.map((a) => a.prompt_id)).catch(() => null).then((got) => {
      if (!live) return;
      const pack = got && got.ranked.length ? got : fallback();
      setRanked(pack.ranked);
      setDrafts(pack.drafts);
      setChosen((cur) => {
        const have = cur.map((c) => c.id);
        const add = Object.keys(pack.drafts).filter((id) => !have.includes(id));
        const filled = cur.map((c) => (c.body ? c : { ...c, body: pack.drafts[c.id]?.[0] ?? "" }));
        return [...filled, ...add.map((id) => ({ id, body: pack.drafts[id]?.[0] ?? "", edited: false }))].slice(0, 3);
      });
      setLoading(false);
    });
    return () => {
      live = false;
    };
    // Once per visit. Refreshes after saving shouldn't redraft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (id: string, body: string, edited = true) => setChosen(chosen.map((c) => (c.id === id ? { ...c, body, edited } : c)));
  const swap = (id: string) => {
    const taken = new Set(chosen.map((c) => c.id));
    const after = ranked.slice(ranked.indexOf(id) + 1).concat(ranked.slice(0, ranked.indexOf(id)));
    const nextId = after.find((r) => !taken.has(r));
    if (!nextId) return;
    setChosen(chosen.map((c) => (c.id === id ? { id: nextId, body: drafts[nextId]?.[0] ?? "", edited: false } : c)));
    if (!drafts[nextId]) {
      promptDrafts(nextId).catch(() => STARTERS[nextId] ?? []).then((d) => {
        setDrafts((x) => ({ ...x, [nextId]: d }));
        setChosen((cur) => cur.map((c) => (c.id === nextId && !c.edited && !c.body ? { ...c, body: d[0] ?? "" } : c)));
      });
    }
  };

  return (
    <section className="miy-card">
      <h2>Pick three.</h2>
      {loading && chosen.length === 0 ? (
        <div className="miy-skeleton" aria-label="Loading">
          <span />
          <span />
          <span />
        </div>
      ) : (
        chosen.map((c, i) => {
          const p = PROMPT_BY_ID.get(c.id);
          if (!p) return null;
          const ideas = (drafts[c.id] ?? []).filter((d) => d !== c.body);
          return (
            <div key={c.id} className="miy-prompt" style={{ "--i": i } as React.CSSProperties}>
              <div className="miy-prompt-head">
                <label className="miy-prompt-q" htmlFor={`pa-${c.id}`}>
                  {p.text}
                </label>
                <button className="link-button quiet" onClick={() => swap(c.id)} aria-label="Different prompt">
                  ↻
                </button>
              </div>
              <textarea id={`pa-${c.id}`} className="textarea" rows={2} maxLength={200} value={c.body} onChange={(e) => set(c.id, e.target.value)} />
              {ideas.length > 0 && (
                <ul className="starters">
                  {ideas.map((s) => (
                    <li key={s}>
                      <button className="starter" onClick={() => set(c.id, s)}>
                        {s}
                      </button>
                    </li>
                  ))}
                  {lines.slice(0, 2).map((l) => (
                    <li key={l.id}>
                      <button className="starter starter-line" onClick={() => set(c.id, l.body.slice(0, 200))}>
                        {l.body} <small>{l.fires} 🔥</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
      <Footer
        pending={pending}
        error={error}
        onSkip={onNext}
        onSave={() =>
          start(async () => {
            const r = await saveAnswers(chosen.map((c) => ({ prompt_id: c.id, body: c.body })));
            if (!r.ok) setError(r.error ?? "That didn't save.");
            else onNext();
          })
        }
      />
    </section>
  );
}

// Say hi: a 15-second hello.
function Voice({ url, converting, onNext }: { url: string | null; converting: boolean; onNext: () => void }) {
  const [script, setScript] = useState(VOICE_SCRIPTS[0]);
  // Picked after load so the server and the phone agree on the first render.
  useEffect(() => setScript(VOICE_SCRIPTS[Math.floor(Math.random() * VOICE_SCRIPTS.length)]), []);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <section className="miy-card">
      <h2>Say hi</h2>
      <p className="fine">Fifteen seconds. Guys who hear you are way more likely to say hi back.</p>
      <p className="miy-script">Not sure what to say? {script}</p>
      {converting && <p className="converting">⏳ Converting your hello. A minute, tops.</p>}
      {url && (
        <>
          <Waveform src={url} />
          <button className="link-button quiet" disabled={pending} onClick={() => start(async () => void (await removeVoice(), router.refresh()))}>
            Remove it
          </button>
        </>
      )}
      <VoiceRecorder
        seconds={15}
        label={url ? "🎙️ Record a new one" : "🎙️ Record your hello"}
        getTicket={(type, size) => voiceTicket(type, size)}
        onUploaded={async (path) => {
          const r = await saveVoice(path);
          if (r.ok) router.refresh();
          return r;
        }}
      />
      <Footer onSave={onNext} onSkip={url ? undefined : onNext} />
    </section>
  );
}

// Photos: up to five more, each with a theme.
function Photos({ photos, mainPhoto, onNext }: { photos: Extras["photos"]; mainPhoto: string | null; onNext: () => void }) {
  const [theme, setTheme] = useState(PHOTO_THEMES[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [recording, setRecording] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const full = photos.length >= 5;
  // Videos still converting: check back every few seconds until they're ready.
  const converting = photos.some((p) => p.kind === "video" && !p.ready);
  useEffect(() => {
    if (!converting) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [converting, router]);

  const pickPhoto = (f: File | undefined) => {
    if (!f) return;
    setError("");
    start(async () => {
      try {
        const small = await shrinkImage(f, 1400);
        const form = new FormData();
        form.set("photo", small);
        form.set("theme", theme);
        const r = await addPhoto(form);
        if (!r.ok) setError(r.error ?? "That didn't upload.");
        router.refresh();
      } catch {
        setError("That photo didn't work. Try another.");
      }
    });
  };

  const sendVideo = async (clip: Blob) => {
    setError("");
    const raw = clip.type.split(";")[0];
    const type = raw === "video/quicktime" || raw === "video/webm" ? raw : "video/mp4";
    if ((await clipLength(clip)) > VIDEO_SECONDS + 1) {
      setError(`Videos can be up to ${VIDEO_SECONDS} seconds. Trim it in Photos first.`);
      return;
    }
    setBusy("Uploading...");
    try {
      const t = await videoTicket(type, clip.size);
      if (!t.ok || !t.signedUrl || !t.path) return setError(t.error ?? "That didn't upload.");
      const up = await fetch(t.signedUrl, { method: "PUT", headers: { "content-type": type, "x-upsert": "false", ...(t.apikey ? { apikey: t.apikey } : {}) }, body: clip });
      if (!up.ok) return setError("The video didn't upload. Try a shorter one.");
      const r = await addVideo(t.path, theme);
      if (!r.ok) setError(r.error ?? "That didn't save.");
      router.refresh();
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="miy-card">
      <h2>Photos and videos</h2>
      <div className="miy-photos">
        <figure className="miy-photo main">
          {mainPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainPhoto} alt="Your main photo" />
          ) : (
            <span />
          )}
        </figure>
        {photos.map((p) => (
          <figure key={p.id} className="miy-photo">
            {p.kind === "video" ? (
              p.ready && p.url ? (
                <video src={p.url} playsInline muted loop autoPlay />
              ) : (
                <span className="miy-photo-wait">Converting…</span>
              )
            ) : (
              p.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={p.theme ?? ""} />
              )
            )}
            {p.held && <span className="miy-photo-flag">Waiting on a quick look</span>}
            <figcaption>
              <select className="input input-small" defaultValue={p.theme ?? ""} onChange={(e) => start(async () => void (await setPhotoTheme(p.id, e.target.value)))} aria-label="Theme">
                <option value="">No theme</option>
                {PHOTO_THEMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <button className="link-button quiet" disabled={pending} onClick={() => start(async () => void (await removePhoto(p.id), router.refresh()))}>
                Remove
              </button>
            </figcaption>
          </figure>
        ))}
        {!full && (
          <label className={pending ? "miy-photo miy-photo-add busy" : "miy-photo miy-photo-add"}>
            <span aria-hidden="true">{pending ? "…" : "+"}</span>
            <input type="file" accept="image/*" className="visually-hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} disabled={pending} aria-label="Add a photo" />
          </label>
        )}
      </div>
      {!full && (
        <div className="miy-video-row">
          <label className={busy ? "btn btn-outline btn-small disabled" : "btn btn-outline btn-small"}>
            {busy || "Upload a video"}
            <input
              type="file"
              accept="video/*"
              className="visually-hidden"
              disabled={!!busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void sendVideo(f);
              }}
            />
          </label>
          <button className="btn btn-outline btn-small" disabled={!!busy} onClick={() => setRecording(true)}>
            Record a video
          </button>
          <span className="fine">Up to {VIDEO_SECONDS} seconds</span>
        </div>
      )}
      {recording && (
        <VideoRecorder
          seconds={VIDEO_SECONDS}
          onCancel={() => setRecording(false)}
          onDone={(clip) => {
            setRecording(false);
            void sendVideo(clip);
          }}
        />
      )}
      {!full && (
        <ul className="chips-pick themes" aria-label="Theme for your next photo or video">
          {PHOTO_THEMES.map((t) => (
            <Chip key={t} on={theme === t} onClick={() => setTheme(t)}>
              {t}
            </Chip>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
      <Footer onSave={onNext} onSkip={photos.length ? undefined : onNext} />
    </section>
  );
}

const VIDEO_SECONDS = 30;
function clipLength(f: Blob): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    const url = URL.createObjectURL(f);
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => resolve(0);
    v.src = url;
  });
}

// Details: all optional, mostly taps.
function Details({ initial, onNext, last }: { initial: Extras["basics"]; onNext: () => void; last: boolean }) {
  const [b, setB] = useState({ ...initial, pronouns: initial.pronouns ?? "", hometown: initial.hometown ?? "", work: initial.work ?? "", zodiac: initial.zodiac ?? "", song: initial.song ?? "", spot: initial.spot ?? "", relationship: initial.relationship ?? "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const chips = (key: "pronouns" | "zodiac" | "relationship", list: string[]) => (
    <ul className="chips-pick">
      {list.map((v) => (
        <Chip key={v} on={b[key] === v} onClick={() => setB({ ...b, [key]: b[key] === v ? "" : v })}>
          {v}
        </Chip>
      ))}
    </ul>
  );
  const field = (key: "hometown" | "work" | "song" | "spot", label: string, ph: string) => (
    <label className="field">
      <span className="eyebrow">{label}</span>
      <input className="input" maxLength={80} value={b[key]} placeholder={ph} onChange={(e) => setB({ ...b, [key]: e.target.value })} />
    </label>
  );
  return (
    <section className="miy-card">
      <h2>The details</h2>
      <p className="eyebrow">Pronouns</p>
      {chips("pronouns", PRONOUNS)}
      {field("work", "Work or school", "Nurse, bartender, student")}
      {field("hometown", "Hometown", "Where you grew up")}
      {field("song", "Song on repeat", "Artist, song")}
      {field("spot", "My spot", "Your favorite place in town")}
      <p className="eyebrow">Sign</p>
      {chips("zodiac", ZODIAC)}
      <p className="eyebrow">Relationship status</p>
      {chips("relationship", RELATIONSHIP)}
      {b.relationship && (
        <label className="agree">
          <input type="checkbox" checked={b.show_relationship} onChange={(e) => setB({ ...b, show_relationship: e.target.checked })} />
          <span>Show it on my profile</span>
        </label>
      )}
      <Footer
        pending={pending}
        error={error}
        label={last ? "Finish" : "Next"}
        onSkip={onNext}
        onSave={() =>
          start(async () => {
            const r = await saveBasics(b);
            if (!r.ok) setError(r.error ?? "That didn't save.");
            else onNext();
          })
        }
      />
    </section>
  );
}

// Greatest Hit: the answer pinned to his profile.
function GreatestHit({ lines, pinned, onNext }: { lines: Line[]; pinned: string | null; onNext: () => void }) {
  const [on, setOn] = useState<string | null>(pinned);
  const [pending, start] = useTransition();
  return (
    <section className="miy-card">
      <h2>Your Greatest Hit</h2>
      <ul className="hits">
        <li>
          <button className={on === null ? "hit on" : "hit"} disabled={pending} onClick={() => start(async () => void (await pinAnswer(null), setOn(null)))}>
            <b>Most 🔥, always</b>
          </button>
        </li>
        {lines.map((l) => (
          <li key={l.id}>
            <button className={on === l.id ? "hit on" : "hit"} disabled={pending} onClick={() => start(async () => void (await pinAnswer(l.id), setOn(l.id)))}>
              &ldquo;{l.body}&rdquo;
              <small>
                S{l.season} W{l.week} · {l.fires} 🔥
              </small>
            </button>
          </li>
        ))}
      </ul>
      <Footer onSave={onNext} label="Finish" />
    </section>
  );
}

export function SectionLinks() {
  return (
    <ul className="profile-sections">
      {STEP_KEYS.filter((k) => k !== "hit").map((k) => (
        <li key={k}>
          <Link href={`/profile/more?step=${k}`}>
            <span>{TITLES[k]}</span>
            <span aria-hidden="true">›</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
