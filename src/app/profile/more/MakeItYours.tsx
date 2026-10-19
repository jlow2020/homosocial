"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VoiceRecorder from "@/components/VoiceRecorder";
import Waveform from "@/components/Waveform";
import { shrinkImage } from "@/lib/image";
import { DOWN_FOR } from "@/lib/profile/catalog";
import { PROFILE_PROMPTS, STARTERS, PHOTO_THEMES, PRONOUNS, ZODIAC, RELATIONSHIP, VOICE_SCRIPTS } from "@/lib/profile/prompts";
import { suggest, search, labelOf, type Community } from "@/lib/profile/suggest";
import type { Extras } from "@/lib/profile/data";
import { addPhoto, pinAnswer, removePhoto, removeVoice, saveAnswers, saveBasics, saveTags, setPhotoTheme, voiceTicket, saveVoice } from "./actions";

type Line = { id: string; body: string; fires: number; week: number; season: number; prompt: string };

const STEPS = ["Into", "Down for", "Prompts", "Voice", "Photos", "Basics", "Greatest Hit"] as const;

export default function MakeItYours({
  extras,
  community,
  seedText,
  seed,
  lines,
  meId,
  mainPhoto,
  startAt = 0,
}: {
  extras: Extras;
  community: Community;
  seedText: string;
  seed: string;
  lines: Line[];
  meId: string;
  mainPhoto: string | null;
  startAt?: number;
}) {
  const [step, setStepRaw] = useState(startAt);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const router = useRouter();
  const setStep = (n: number) => {
    setDir(n >= step ? "fwd" : "back");
    setStepRaw(n);
  };
  const go = (n: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
    router.refresh();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="miy">
      <nav className="miy-steps" aria-label="Profile sections">
        {STEPS.map((s, i) => (
          <button key={s} className={i === step ? "miy-step on" : "miy-step"} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}>
            <span className="miy-num">{i + 1}</span>
            {s}
          </button>
        ))}
      </nav>
      <div key={step} className={`miy-pane ${dir}`}>
      {step === 0 && <Interests initial={extras.interests} community={community} seedText={seedText} seed={seed} onNext={() => go(1)} />}
      {step === 1 && <DownFor initial={extras.down} onNext={() => go(2)} />}
      {step === 2 && <Prompts initial={extras.answers} lines={lines} onNext={() => go(3)} />}
      {step === 3 && <Voice url={extras.voiceUrl} converting={!extras.voiceReady} onNext={() => go(4)} />}
      {step === 4 && <Photos photos={extras.photos} mainPhoto={mainPhoto} onNext={() => go(5)} />}
      {step === 5 && <Basics initial={extras.basics} onNext={() => go(6)} />}
      {step === 6 && <GreatestHit lines={lines} pinned={extras.pinned} meId={meId} />}
      </div>
    </div>
  );
}

function Footer({ pending, error, onSave, label = "Save and keep going", skip }: { pending: boolean; error: string; onSave: () => void; label?: string; skip?: () => void }) {
  return (
    <div className="miy-foot">
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn btn-pink" disabled={pending} onClick={onSave}>
          {pending ? "Saving..." : label}
        </button>
        {skip && (
          <button className="link-button quiet" onClick={skip}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

// 1. Tags that adapt as he taps.
function Interests({ initial, community, seedText, seed, onNext }: { initial: string[]; community: Community; seedText: string; seed: string; onNext: () => void }) {
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
      <p className="fine">Tap anything that&apos;s you. Every tap changes what shows up next. Pick at least five.</p>
      {picked.length > 0 && (
        <ul className="chips-pick picked" aria-label="Your tags">
          {picked.map((s) => (
            <li key={s} className="chip-in">
              <button className="chip on" onClick={() => toggle(s)} aria-label={`Remove ${label(s)}`}>
                {label(s)} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="visually-hidden" htmlFor="tag-search">
        Search or add your own
      </label>
      <input id="tag-search" className="input" placeholder="Search, or type something we missed" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), found[0] ? (toggle(found[0].slug), setQ("")) : addOwn())} />
      {q.trim().length >= 2 && (
        <ul className="chips-pick">
          {found.map((f) => (
            <li key={f.slug}>
              <button className="chip" onClick={() => (toggle(f.slug), setQ(""))}>
                {f.label}
              </button>
            </li>
          ))}
          <li>
            <button className="chip chip-add" disabled={pending} onClick={addOwn}>
              + Add &ldquo;{q.trim()}&rdquo;
            </button>
          </li>
        </ul>
      )}
      <ul className="chips-pick ideas">
        {ideas.map((s, i) => (
          <li key={s.slug} style={{ "--i": i } as React.CSSProperties}>
            <button className="chip" onClick={() => toggle(s.slug)}>
              {s.label}
              <small>{s.why}</small>
            </button>
          </li>
        ))}
      </ul>
      <Footer
        pending={pending}
        error={error}
        onSave={() =>
          start(async () => {
            if (picked.length < 5) return setError("Pick at least five. The more you pick, the better your matches.");
            const r = await saveTags("interest", picked);
            if (!r.ok) setError(r.error ?? "That didn't save.");
            else onNext();
          })
        }
      />
    </section>
  );
}

// 2. Things he's down to do.
function DownFor({ initial, onNext }: { initial: string[]; onNext: () => void }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="miy-card">
      <h2>What are you down for?</h2>
      <p className="fine">When someone in your Circle posts a plan you&apos;re down for, you&apos;ll hear about it.</p>
      <ul className="chips-pick">
        {DOWN_FOR.map((d) => (
          <li key={d.slug}>
            <button className={picked.includes(d.slug) ? "chip on" : "chip"} aria-pressed={picked.includes(d.slug)} onClick={() => setPicked(picked.includes(d.slug) ? picked.filter((x) => x !== d.slug) : [...picked, d.slug])}>
              {d.label}
            </button>
          </li>
        ))}
      </ul>
      <Footer
        pending={pending}
        error={error}
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

// 3. Three prompts, with starters and his own best lines.
function Prompts({ initial, lines, onNext }: { initial: { prompt_id: string; body: string }[]; lines: Line[]; onNext: () => void }) {
  const [chosen, setChosen] = useState<{ prompt_id: string; body: string }[]>(initial.map((a) => ({ prompt_id: a.prompt_id, body: a.body })));
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const per = 8;
  const pool = PROFILE_PROMPTS.filter((p) => !chosen.some((c) => c.prompt_id === p.id));
  const shown = pool.slice((page * per) % Math.max(1, pool.length), ((page * per) % Math.max(1, pool.length)) + per);
  const set = (id: string, body: string) => setChosen(chosen.map((c) => (c.prompt_id === id ? { ...c, body } : c)));

  return (
    <section className="miy-card">
      <h2>Three prompts</h2>
      <p className="fine">Pick three. Each one comes with a few starters: tap one, change a word or two, and it&apos;s yours.</p>
      {chosen.map((c) => {
        const p = PROFILE_PROMPTS.find((x) => x.id === c.prompt_id)!;
        return (
          <div key={c.prompt_id} className="miy-prompt">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <label className="miy-prompt-q" htmlFor={`pa-${c.prompt_id}`}>
                {p.text}
              </label>
              <button className="link-button quiet" onClick={() => setChosen(chosen.filter((x) => x.prompt_id !== c.prompt_id))}>
                Swap
              </button>
            </div>
            <textarea id={`pa-${c.prompt_id}`} className="textarea" rows={2} maxLength={200} value={c.body} onChange={(e) => set(c.prompt_id, e.target.value)} placeholder={p.hint || "Say it like you'd say it out loud."} />
            <ul className="starters" aria-label="Starters">
              {(STARTERS[c.prompt_id] ?? []).map((s) => (
                <li key={s}>
                  <button className="starter" onClick={() => set(c.prompt_id, s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            {lines.length > 0 && (
              <details className="your-lines">
                <summary>Or use one of your lines from the game</summary>
                <ul>
                  {lines.slice(0, 4).map((l) => (
                    <li key={l.id}>
                      <button className="starter" onClick={() => set(c.prompt_id, l.body.slice(0, 200))}>
                        &ldquo;{l.body}&rdquo; <small>Week {l.week} · {l.fires} 🔥</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      })}
      {chosen.length < 3 && (
        <>
          <p className="eyebrow">Pick {3 - chosen.length} more</p>
          <ul className="chips-pick">
            {shown.map((p) => (
              <li key={p.id}>
                <button className="chip" onClick={() => setChosen([...chosen, { prompt_id: p.id, body: "" }])}>
                  {p.text}
                </button>
              </li>
            ))}
            <li>
              <button className="chip chip-add" onClick={() => setPage(page + 1)}>
                More prompts
              </button>
            </li>
          </ul>
        </>
      )}
      <Footer
        pending={pending}
        error={error}
        onSave={() =>
          start(async () => {
            const r = await saveAnswers(chosen);
            if (!r.ok) setError(r.error ?? "That didn't save.");
            else onNext();
          })
        }
      />
    </section>
  );
}

// 4. A 15-second hello.
function Voice({ url, converting, onNext }: { url: string | null; converting: boolean; onNext: () => void }) {
  const [script] = useState(() => VOICE_SCRIPTS[Math.floor(Math.random() * VOICE_SCRIPTS.length)]);
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
      <div className="miy-foot">
        <button className="btn btn-outline" onClick={onNext}>
          Next
        </button>
      </div>
    </section>
  );
}

// 5. Photos with themes.
function Photos({ photos, mainPhoto, onNext }: { photos: Extras["photos"]; mainPhoto: string | null; onNext: () => void }) {
  const [theme, setTheme] = useState(PHOTO_THEMES[0]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const pick = (f: File | undefined) => {
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
  return (
    <section className="miy-card">
      <h2>More photos</h2>
      <p className="fine">Up to five more. Give each one a theme so it says something.</p>
      <div className="miy-photos">
        <figure className="miy-photo main">
          {mainPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainPhoto} alt="Your main photo" />
          ) : (
            <span />
          )}
          <figcaption>
            Main photo · <Link href="/profile">change</Link>
          </figcaption>
        </figure>
        {photos.map((p) => (
          <figure key={p.id} className="miy-photo">
            {p.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.url} alt={p.theme ?? ""} />
            )}
            <figcaption>
              <select className="input" defaultValue={p.theme ?? ""} onChange={(e) => start(async () => void (await setPhotoTheme(p.id, e.target.value)))} aria-label="Theme">
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
      </div>
      {photos.length < 5 && (
        <div className="miy-add">
          <label className="field">
            <span className="label">Theme for the next one</span>
            <select className="input" value={theme} onChange={(e) => setTheme(e.target.value)}>
              {PHOTO_THEMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="btn btn-pink">
            {pending ? "Checking..." : "Add a photo"}
            <input type="file" accept="image/*" className="visually-hidden" onChange={(e) => pick(e.target.files?.[0])} disabled={pending} />
          </label>
        </div>
      )}
      <p className="fine">Underwear and thirst traps are fine. Nothing more, it&apos;s a profile.</p>
      {error && <p className="error">{error}</p>}
      <div className="miy-foot">
        <button className="btn btn-outline" onClick={onNext}>
          Next
        </button>
      </div>
    </section>
  );
}

// 6. Basics, all optional, mostly taps.
function Basics({ initial, onNext }: { initial: Extras["basics"]; onNext: () => void }) {
  const [b, setB] = useState({ ...initial, pronouns: initial.pronouns ?? "", hometown: initial.hometown ?? "", work: initial.work ?? "", zodiac: initial.zodiac ?? "", song: initial.song ?? "", spot: initial.spot ?? "", relationship: initial.relationship ?? "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const chips = (key: "pronouns" | "zodiac" | "relationship", list: string[]) => (
    <ul className="chips-pick">
      {list.map((v) => (
        <li key={v}>
          <button className={b[key] === v ? "chip on" : "chip"} aria-pressed={b[key] === v} onClick={() => setB({ ...b, [key]: b[key] === v ? "" : v })}>
            {v}
          </button>
        </li>
      ))}
    </ul>
  );
  const field = (key: "hometown" | "work" | "song" | "spot", label: string, ph: string) => (
    <label className="field">
      <span className="label">{label}</span>
      <input className="input" maxLength={80} value={b[key]} placeholder={ph} onChange={(e) => setB({ ...b, [key]: e.target.value })} />
    </label>
  );
  return (
    <section className="miy-card">
      <h2>The basics</h2>
      <p className="fine">All optional. Skip anything you want.</p>
      <p className="eyebrow">Pronouns</p>
      {chips("pronouns", PRONOUNS)}
      {field("hometown", "Hometown", "Or \"Florida since 2015\"")}
      {field("work", "Work or school", "Nurse, bartender, grad student, retired, figuring it out")}
      {field("song", "Song on repeat", "Artist, song")}
      {field("spot", "My spot", "A place in town you'd take someone")}
      <p className="eyebrow">Sign</p>
      {chips("zodiac", ZODIAC)}
      <p className="eyebrow">Relationship status</p>
      {chips("relationship", RELATIONSHIP)}
      <label className="agree">
        <input type="checkbox" checked={b.show_relationship} onChange={(e) => setB({ ...b, show_relationship: e.target.checked })} />
        <span>Show my relationship status to my Circle</span>
      </label>
      <Footer
        pending={pending}
        error={error}
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

// 7. His Greatest Hit.
function GreatestHit({ lines, pinned, meId }: { lines: Line[]; pinned: string | null; meId: string }) {
  const [on, setOn] = useState<string | null>(pinned);
  const [pending, start] = useTransition();
  return (
    <section className="miy-card">
      <h2>Your Greatest Hit</h2>
      <p className="fine">Your most-fired answer from the game goes on your profile automatically. Want a different one? Pick it.</p>
      {lines.length === 0 ? (
        <p className="fine">Play a few drops. Your best line shows up here on its own.</p>
      ) : (
        <ul className="hits">
          <li>
            <button className={on === null ? "hit on" : "hit"} disabled={pending} onClick={() => start(async () => void (await pinAnswer(null), setOn(null)))}>
              <b>Automatic</b> <small>Always your most-fired answer</small>
            </button>
          </li>
          {lines.map((l) => (
            <li key={l.id}>
              <button className={on === l.id ? "hit on" : "hit"} disabled={pending} onClick={() => start(async () => void (await pinAnswer(l.id), setOn(l.id)))}>
                &ldquo;{l.body}&rdquo;
                <small>
                  Season {l.season}, Week {l.week} · {l.fires} 🔥
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="miy-foot">
        <Link href={`/circle/guy/${meId}`} className="btn btn-pink">
          See your profile
        </Link>
      </div>
    </section>
  );
}
