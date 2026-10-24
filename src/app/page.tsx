import Link from "next/link";
import TopBar from "@/components/TopBar";
import { SEASON, FOUNDER_CAP } from "@/lib/season";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { Metadata } from "next";
import { pickCard, shareMetadata } from "@/lib/og";

// Rendered per visit, so each share can pick a different preview card.
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ card?: string }> }): Promise<Metadata> {
  const { card } = await searchParams;
  return shareMetadata(pickCard(card));
}

const steps = [
  { title: "Join", body: "Make a profile and pass a quick photo check. You're put in a Circle with guys near you." },
  { title: "Play", body: "A new game drops every Monday. Answer it, see everyone else's, talk in the group chat and DMs." },
  { title: "Pick", body: "Week 8 is the Finale. Pick who you want to keep as friends, or more. Only mutual picks are revealed." },
];

const faq = [
  { q: "Who can play?", a: `Gay, bi, trans and queer men, ${SEASON.minAge} and up, anywhere in the US.` },
  { q: "What does it cost?", a: "Nothing." },
  { q: "Is it a dating app?", a: "It's for making friends. If you want more, flip one private switch and the Finale asks a second question. Nobody else ever sees it." },
  { q: "Is everyone real?", a: "Yes. Every guy passes a live photo check and a one-time ID check before he can talk to anyone. ID photos are deleted right after." },
];

async function foundersLeft(): Promise<number | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { count, error } = await db.from("profiles").select("id", { count: "exact", head: true }).not("founder_no", "is", null);
  if (error) return null;
  return Math.max(FOUNDER_CAP - (count ?? 0), 0);
}

// Thirty seats around a ring. They light up one at a time on load.
function Ring() {
  const n = SEASON.spots;
  const r = 150;
  return (
    <svg className="ring" viewBox="-180 -180 360 360" role="img" aria-label={`A Circle: ${n} seats`}>
      <circle className="ring-track" r={r} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return (
          <circle
            key={i}
            className={i < 2 ? "seat-dot seat-first" : "seat-dot"}
            cx={Math.round(Math.cos(a) * r * 100) / 100}
            cy={Math.round(Math.sin(a) * r * 100) / 100}
            r={11}
            style={{ animationDelay: `${300 + i * 70}ms` }}
          />
        );
      })}
    </svg>
  );
}

export default async function Home() {
  const left = await foundersLeft();
  return (
    <main className="home">
      <TopBar
        right={
          <Link href="/me" className="topbar-link">
            Sign in
          </Link>
        }
      />

      <section className="wrap home-hero">
        <div className="home-hero-copy">
          <h1>
            <span>Meet {SEASON.spots} guys.</span> <span>Play for 8 weeks.</span>
          </h1>
          <p className="home-lede">A social game for gay, bi, trans and queer men. Same group, a new game every Monday.</p>
          <div className="home-cta">
            <Link href="/join" className="btn btn-pink btn-big">
              Join a Circle
            </Link>
            <span className="home-meta">Free. {SEASON.minAge}+. Anywhere in the US.</span>
          </div>
          {left !== null && left > 0 && <p className="home-founders">★ {left} Founder spots left</p>}
        </div>
        <div className="home-ring">
          <Ring />
        </div>
      </section>

      <section className="wrap home-steps" aria-label="How it works">
        <ol>
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="home-step-n">{i + 1}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap home-drop" aria-label="An example game">
        <div className="home-drop-card">
          <p className="home-drop-week">Week 2</p>
          <p className="home-drop-q">Who in your Circle would you call at 2am?</p>
          <ul className="home-drop-answers" aria-hidden="true">
            <li />
            <li />
            <li />
          </ul>
          <p className="home-drop-lock">Answers unlock when you post yours.</p>
        </div>
      </section>

      <section className="wrap home-faq">
        <dl>
          {faq.map((f) => (
            <div key={f.q}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="wrap home-close">
        <Link href="/join" className="btn btn-pink btn-big">
          Join a Circle
        </Link>
      </section>
    </main>
  );
}
