import Link from "next/link";
import TopBar from "@/components/TopBar";
import Countdown from "@/components/Countdown";
import { EPISODES, SEASON } from "@/lib/season";

const faq = [
  {
    q: "Who can join?",
    a: `Gay, bi, trans and queer men, ${SEASON.minAge} and up, anywhere in the US.`,
  },
  {
    q: "What does it cost?",
    a: "Nothing.",
  },
  {
    q: "Who's in my Circle?",
    a: `Up to ${SEASON.spots} guys who live near you. Your Circle premieres once ${SEASON.minToOpen} are in, and guys can still join late.`,
  },
  {
    q: "Do I have to meet anyone in person?",
    a: "No. The season happens on your phone. If you click with someone, meeting up is between you two. Nobody gets assigned to a dinner with strangers.",
  },
  {
    q: "How do you keep it safe?",
    a: "Every guy passes a Realness Check: a 20-second camera check that he's a real, live person who matches his photo. Nobody's location is ever shown. Block or report anyone, and three reports pauses an account automatically.",
  },
  {
    q: "What happens after the Finale?",
    a: "Your Circle can run it back for another season, or you get mixed into a new cast. Everyone you matched with stays yours either way.",
  },
];

export default function Home() {
  return (
    <main>
      <TopBar
        right={
          <Link href="/me" className="topbar-link">
            Sign in
          </Link>
        }
      />

      <section className="wrap hero">
        <div className="chyron">
          <span className="chy-hot">Now casting</span>
          <span className="chy-light">{SEASON.name}, everywhere in the US</span>
        </div>
        <h1>Your favorite people are still strangers.</h1>
        <div className="hero-row">
          <p className="lede">
            Homosocial is a reality show where you are the cast and there is no
            audience. {SEASON.spots} guys near you. Eight weekly episodes. One
            Finale where everyone finds out who wants more.
          </p>
          <div className="cta">
            <Link href="/join" className="btn btn-pink btn-big">
              Get cast
            </Link>
            <span className="cta-meta">
              Free. {SEASON.minAge} and up. Gay, bi, trans and queer men.
            </span>
          </div>
        </div>
      </section>

      <section className="guide">
        <div className="wrap guide-inner">
          <div className="section-head">
            <h2>The season</h2>
            <p>A new episode every Monday. Every episode gets a little closer.</p>
          </div>
          <ol className="episodes">
            {EPISODES.map((e) => (
              <li
                key={e.n}
                className={e.n === 8 ? "episode episode-finale" : "episode"}
              >
                <span className="ep-num">Episode {e.n}</span>
                <span className="ep-title">{e.title}</span>
                <span className="ep-blurb">{e.blurb}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="wrap rules-show">
        <h2 className="big-h2">The rules of this show</h2>
        <div className="rule-grid">
          <div className="rule">
            <h3>No browsing</h3>
            <p>
              No grid, no search, no strangers. The only guys you see are the
              ones in your Circle. You can&apos;t scroll past someone, so you
              actually meet him.
            </p>
          </div>
          <div className="rule">
            <h3>Nobody gets voted off</h3>
            <p>
              No eliminations, no polls about each other, no drama for
              drama&apos;s sake. It&apos;s the fun of being on the show without
              the cruelty.
            </p>
          </div>
          <div className="rule rule-gold">
            <h3>Roses only go up</h3>
            <p>
              At the Finale you only ever see who picked you back. Nobody finds
              out who didn&apos;t. Nobody leaves the season empty-handed.
            </p>
          </div>
        </div>
      </section>

      <section className="dating">
        <div className="wrap dating-inner">
          <div className="dating-copy">
            <h2>Friends. And maybe more.</h2>
            <p>
              Dating is one private switch. Flip it and the Finale asks you a
              second question. Nobody else ever knows you flipped it. Eight
              weeks of watching a guy be funny and kind beats eight seconds of
              looking at his torso.
            </p>
          </div>
          <Countdown />
        </div>
      </section>

      <section className="wrap faq">
        <h2 className="big-h2">Questions</h2>
        <dl className="faq-list">
          {faq.map((f) => (
            <div key={f.q} className="faq-item">
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="wrap closer">
        <h2>
          {SEASON.spots === 30 ? "Thirty" : SEASON.spots} guys. Eight weeks.
          You&apos;re in the cast.
        </h2>
        <p>
          Sign up, answer a few questions so we can cast you well, and pass a
          20-second Realness Check so everyone in your Circle is who he says he
          is.
        </p>
        <Link href="/join" className="btn btn-pink btn-big">
          Get cast
        </Link>
      </section>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span className="wordmark">Homosocial</span>
          <span>
            Good company. Questionable behavior.{" "}
            <Link href="/rules">House rules</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
