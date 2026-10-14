import Link from "next/link";
import CircleRing from "@/components/CircleRing";
import { SEASON } from "@/lib/season";
import { getOpenCircle } from "@/lib/supabase-server";

export const revalidate = 60;


const weeks = [1, 2, 3, 4, 5, 6, 7, 8];

const faq = [
  {
    q: "Who can join?",
    a: `Gay, bi, and queer men, 18 and up, who live in or around ${SEASON.area}.`,
  },
  {
    q: "What does it cost?",
    a: "Nothing.",
  },
  {
    q: "Do I have to meet anyone in person?",
    a: "No. The Season happens online, in your Circle. If you click with someone, meeting up is between you two. Nobody gets assigned to a dinner with strangers.",
  },
  {
    q: "How do you keep it safe?",
    a: "Every member passes a Realness Check: a 20-second camera check that he's a real, live person who matches his photo. Nobody's location is ever shown. Block or report anyone from his profile, and three reports pauses an account automatically.",
  },
  {
    q: "Is this a dating app?",
    a: "No, but dating is allowed. Turn it on and Last Call asks you a second question. Leave it off and you'll never see it.",
  },
  {
    q: "What happens after Season 0?",
    a: `${SEASON.next}. Everyone from Season 0 gets in first.`,
  },
];

export default async function Home() {
  const open = await getOpenCircle();

  return (
    <main>
      <section className="hero">
        <header className="topbar wrap">
          <span className="wordmark">homosocial</span>
          <Link href="/me" className="topbar-link">
            Sign in
          </Link>
        </header>

        <div className="wrap">
          <h1>Your favorite people are still strangers.</h1>
        </div>
        <div className="hero-grid wrap">
          <div className="hero-copy">
            <p className="lede">
              Homosocial puts {SEASON.spots} gay, bi, and queer guys from the
              same corner of {SEASON.areaShort} into one group for eight weeks.
              Same faces every week. At the end, you find out who wants more.
            </p>
            <div className="hero-actions">
              <Link href="/join" className="btn btn-pink">
                Join {SEASON.name}
              </Link>
              <p className="hero-meta">
                Free. Starts {SEASON.starts}.
              </p>
            </div>
          </div>
          <CircleRing
            spots={SEASON.spots}
            taken={open.taken}
            label={`Circle ${open.number}`}
            sublabel={`${SEASON.name}, ${SEASON.areaShort}`}
          />
        </div>
      </section>

      <section className="season">
        <div className="wrap">
          <h2>How a Season works</h2>
          <p className="section-lede">
            Friendships don&apos;t come from one awkward meetup. They come from
            seeing the same guys over and over until you&apos;re not strangers
            anymore. A Season is built to make that happen on purpose.
          </p>

          <ol className="weeks" aria-label="The eight weeks of a Season">
            {weeks.map((w) => (
              <li key={w} className={w === 8 ? "week week-last" : "week"}>
                <span className="week-num">{w}</span>
                <span className="week-name">
                  {w === 1 ? "Meet" : w === 8 ? "Last Call" : "Drop"}
                </span>
              </li>
            ))}
          </ol>

          <div className="beats">
            <article className="beat">
              <h3>Meet your Circle</h3>
              <p>
                {SEASON.spots} guys, all within about 20 minutes of each other.
                You get to know them in the group first. No grid of torsos, no
                distance in feet.
              </p>
            </article>
            <article className="beat">
              <h3>The Monday drop</h3>
              <p>
                One prompt every Monday. Hot takes, ranking fights, show us your
                fridge. You find out who&apos;s funny, who&apos;s kind, and
                who&apos;s a menace.
              </p>
            </article>
            <article className="beat">
              <h3>Make your own plans</h3>
              <p>
                Trivia Thursday? Post it and see who&apos;s in. People meet up
                when they already like each other, not because an app told them
                to.
              </p>
            </article>
            <article className="beat beat-last">
              <h3>Last Call</h3>
              <p>
                In week eight you privately pick who you want to keep, and you
                can nominate two guys who should be set up. Only mutual picks
                get revealed. Nobody ever finds out who didn&apos;t pick him.
              </p>
            </article>
          </div>

          <p className="after">
            Then your Circle votes to run it back together, or everyone gets
            remixed into new Circles. Your mutuals stay yours either way.
          </p>
        </div>
      </section>

      <section className="dating">
        <div className="wrap dating-inner">
          <h2>About the husband thing</h2>
          <p>
            Dating is one switch. Flip it and Last Call asks a second, quieter
            question. Guys who only want friends never see it. Your future
            husband might be in your Circle. More likely, he&apos;s a friend of
            someone in it.
          </p>
        </div>
      </section>

      <section className="faq">
        <div className="wrap">
          <h2>Questions</h2>
          <dl className="faq-list">
            {faq.map((f) => (
              <div key={f.q} className="faq-item">
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="closer">
        <div className="wrap">
          <div className="closer-inner">
          <h2>
            {SEASON.spots} spots. Eight weeks. Starts {SEASON.starts}.
          </h2>
            <Link href="/join" className="btn btn-pink">
              Join {SEASON.name}
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer wrap">
        <span className="wordmark wordmark-small">homosocial</span>
        <span>
          Good company. Questionable behavior. Made in Sarasota.{" "}
          <Link href="/rules">House rules</Link>
        </span>
      </footer>
    </main>
  );
}
