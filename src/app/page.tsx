import Link from "next/link";
import TopBar from "@/components/TopBar";
import Countdown from "@/components/Countdown";
import { WEEKS, SEASON } from "@/lib/season";

const plays = [
  { title: "Monday drops", tone: "hot", body: "A new prompt every week. Hot takes, show us your fridge, rank the Spice Girls. Answer to see everyone else's." },
  { title: "The Lounge", tone: "gold", body: "Your Circle's group chat. It gets chaotic by week three. That's the point." },
  { title: "Plans", tone: "mint", body: "Trivia night, beach day, a terrible movie. Anyone can post a plan and see who's in." },
  { title: "DMs", tone: "hot", body: "Slide in, but only inside your Circle. Photos unlock when you both say yes." },
  { title: "Roses", tone: "gold", body: "Week seven, everyone says something kind about someone, out loud, by name. It hits harder than you think." },
  { title: "The Finale", tone: "mint", body: "Sunday, 8pm. Private picks, only mutuals revealed. Your phone will be in your hand at 7:59." },
];

const faq = [
  {
    q: "Is this a TV show?",
    a: "No. Nothing is filmed, recorded or posted anywhere. It's a game played in seasons, like one: your Circle, a new drop every week, a Finale. Everything stays inside your Circle.",
  },
  {
    q: "Who can join?",
    a: `Gay, bi, trans and queer men, ${SEASON.minAge} and up, anywhere in Florida. More states after Season 1.`,
  },
  {
    q: "What does it cost?",
    a: "Nothing.",
  },
  {
    q: "Who's in my Circle?",
    a: `Up to ${SEASON.spots} guys who live near you. Your Circle kicks off once ${SEASON.minToOpen} are in, and guys can still join late.`,
  },
  {
    q: "Do I have to meet anyone in person?",
    a: "No. The season happens on your phone. If you click with someone, meeting up is between you two. Nobody gets assigned to a dinner with strangers.",
  },
  {
    q: "How do you keep it safe?",
    a: "Every guy passes a Realness Check, a 20-second camera check that he's a real, live person who matches his photo, and a one-time ID check before he gets his seat. We delete the ID photos right after. Nobody's location is ever shown. Block or report anyone, and three reports pauses an account automatically.",
  },
  {
    q: "What happens after the Finale?",
    a: "Your Circle can run it back for another season, or you get mixed into a new Circle. Everyone you matched with stays yours either way.",
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
          <span className="chy-hot">Doors open</span>
          <span className="chy-light">{SEASON.name}, Florida</span>
        </div>
        <h1>Your favorite people are still strangers.</h1>
        <div className="hero-row">
          <p className="lede">
            A social game played in seasons, like your favorite reality show,
            minus the cameras. Just you and {SEASON.spots} guys near you, one new
            drop a week, for eight weeks. It&apos;s a game for making friends, doing fun stuff
            together, and maybe finding a boyfriend.
          </p>
          <div className="cta">
            <Link href="/join" className="btn btn-pink btn-big">
              Grab a seat
            </Link>
            <span className="cta-meta">
              Free. {SEASON.minAge} and up. Gay, bi, trans and queer men.
            </span>
          </div>
        </div>
      </section>

      <section className="wrap plays">
        <h2 className="big-h2">What you&apos;ll actually do</h2>
        <ul className="play-grid">
          {plays.map((x) => (
            <li key={x.title} className={`play play-${x.tone}`}>
              <h3>{x.title}</h3>
              <p>{x.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="guide">
        <div className="wrap guide-inner">
          <div className="section-head">
            <h2>The season</h2>
            <p>A new drop every Monday. Every week gets a little closer.</p>
          </div>
          <ol className="episodes">
            {WEEKS.map((e) => (
              <li
                key={e.n}
                className={e.n === 8 ? "episode episode-finale" : "episode"}
              >
                <span className="ep-num">Week {e.n}</span>
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
              drama&apos;s sake. It&apos;s the fun of a reality show without the
              cruelty.
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
          Grab a seat.
        </h2>
        <p>
          Sign up, pass a 20-second Realness Check, and look around the lobby.
          One quick ID check and the seat is yours, in a Circle full of guys
          who are exactly who they say they are.
        </p>
        <Link href="/join" className="btn btn-pink btn-big">
          Grab a seat
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
