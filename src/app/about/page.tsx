import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Mail, type Section } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";
import { SEASON } from "@/lib/season";

export const metadata: Metadata = {
  title: "About | Homosocial",
  description: "A social game for gay, bi, trans and queer men, played in Seasons. Like your favorite reality show, minus the cameras.",
};

const sections: Section[] = [
  {
    id: "what",
    title: "What it is",
    body: (
      <>
        <p>
          Homosocial is a social game for gay, bi, trans and queer men. Like your favorite reality show, minus the cameras.
        </p>
        <p>
          You join a Circle of up to {SEASON.spots} real, verified guys near you. For eight weeks there&apos;s a new drop every
          Monday: a question, a game, a dare, a survey, a photo. You answer to see everyone else&apos;s. There&apos;s a group chat,
          plans to actually go do things, DMs, and Roses in Week 7. It ends with the Finale, where everyone makes private picks
          and only the ones that go both ways get revealed.
        </p>
      </>
    ),
  },
  {
    id: "why",
    title: "Why",
    body: (
      <p>
        The apps are built for swiping, and swiping got lonely. Friends get made by spending time together, joking around, and
        seeing who shows up. Homosocial gives you a group, a reason to talk every week, and an ending that makes you decide
        who you want to keep. Make friends, do fun stuff, maybe find a boyfriend.
      </p>
    ),
  },
  {
    id: "real",
    title: "Real guys only",
    body: (
      <p>
        Every member passes a Realness Check and a one-time ID check, so everyone in your Circle is a real adult who looks like
        his photo. We never keep pictures of your ID, and we never sell your data. See our{" "}
        <Link href="/privacy">Privacy Policy</Link> and <Link href="/biometrics">Biometric and ID Notice</Link>.
      </p>
    ),
  },
  {
    id: "who",
    title: "Who's behind it",
    body: (
      <p>
        Homosocial is made by {LEGAL.company}, a small, independent company in Sarasota, Florida. Season 1 is Florida only. Say
        hi at <Mail to={LEGAL.support} />.
      </p>
    ),
  },
];

export default function About() {
  return <LegalPage title="About Homosocial" lede="Good company. Questionable behavior." sections={sections} dated={false} />;
}
