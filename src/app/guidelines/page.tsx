import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Mail, type Section } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Community Guidelines | Homosocial",
  description: "The house rules. Be real, be decent, keep it out of the gutter in the group.",
};

const sections: Section[] = [
  {
    id: "real",
    title: "Be real",
    body: (
      <ul>
        <li>You&apos;re 18 or older, and you prove it once with an ID check. No exceptions.</li>
        <li>You&apos;re you. Your face, your first name, your photos. One account per person.</li>
        <li>Your profile photo shows your face, clearly, and only you.</li>
      </ul>
    ),
  },
  {
    id: "spicy",
    title: "Spicy is fine. Explicit has a place.",
    body: (
      <ul>
        <li>
          <b>Anywhere the whole Circle can see</b> (drops, the Lounge, Plans, Roses, your profile photo): flirty, filthy-minded,
          underwear, thirst traps and a bare butt are all fine. Genitals, an anus, and sex acts are not.
        </li>
        <li>
          <b>In DMs</b>, explicit photos and videos are fine only after you both turn photos on, and only of yourself.
        </li>
        <li>Nobody owes you a photo. Asking once is flirting. Asking again after a no is harassment.</li>
      </ul>
    ),
  },
  {
    id: "vault",
    title: "What happens in the Circle stays in the Circle",
    body: (
      <ul>
        <li>Never screenshot, save, forward or post anyone&apos;s photos, messages or answers outside Homosocial.</li>
        <li>
          <b>Never out anyone.</b> Some guys here aren&apos;t out at work, at home, or anywhere else. Who&apos;s on Homosocial is
          nobody&apos;s business but theirs.
        </li>
        <li>Never share anyone&apos;s private images, ever, for any reason. That&apos;s a permanent ban and maybe a crime.</li>
        <li>Don&apos;t try to figure out who wrote an anonymous answer outside the game, or post who you think it was.</li>
      </ul>
    ),
  },
  {
    id: "decent",
    title: "Be decent",
    body: (
      <ul>
        <li>No harassment, threats, stalking, or piling on.</li>
        <li>No hate: nothing attacking anyone for race, ethnicity, religion, disability, HIV status, gender identity, sexual orientation, body, or age.</li>
        <li>
          Preferences are yours. Posting exclusions like &ldquo;no fats, no fems, no Asians&rdquo; isn&apos;t a preference,
          it&apos;s a put-down. Don&apos;t.
        </li>
        <li>Trans men are men. Bi guys are welcome. Nobody here has to prove anything to you.</li>
        <li>&ldquo;No&rdquo; and no reply are both answers. Take them.</li>
      </ul>
    ),
  },
  {
    id: "never",
    title: "Never, ever",
    body: (
      <ul>
        <li>Anything sexualizing a minor. Instant ban, reported to the authorities.</li>
        <li>Buying or selling sex, or offering anything sexual for money or gifts.</li>
        <li>Selling drugs, or anything else. No ads, promos, OnlyFans links, MLM, or recruiting.</li>
        <li>Asking anyone for money, gift cards, crypto, or account details.</li>
        <li>Scraping, bots, fake accounts, or messing with the site.</li>
      </ul>
    ),
  },
  {
    id: "irl",
    title: "Out in the world",
    body: (
      <p>
        Plans are the point. Meet in public the first time, tell a friend where you&apos;ll be, and get yourself home. More on
        the <Link href="/safety">Safety</Link> page.
      </p>
    ),
  },
  {
    id: "report",
    title: "When someone breaks the rules",
    body: (
      <>
        <p>
          <b>Block or report him</b> from his card in your Circle, or tap <b>Report</b> on any answer. Reporting a guy also blocks
          him, and he never learns who reported him. In a DM, tap Report under any photo or video.
        </p>
        <p>
          Two reports on one answer hide it until a moderator looks. Three reports from different members pause an account
          automatically until it&apos;s reviewed.
        </p>
        <p>
          <b>The filter.</b> Posts and photos get checked automatically for the serious stuff above. If it&apos;s not sure, your
          post goes up as normal. If it&apos;s sure, your post waits for a quick look by a person, and only you can see it until
          then. If the person says it&apos;s fine, it posts with no mark on your account. The filter never gives strikes.
        </p>
        <p>
          <b>Strikes</b> only come from a person. One is a warning. Two in 90 days is a 7-day pause. Three pauses your account
          until it&apos;s reviewed.
        </p>
        <p>
          What happens next depends on how bad it was: a warning, content removed, a pause, or a permanent ban. Some things
          (minors, sharing private images, threats of violence) are a ban on the first offense. Think we got it wrong? Email{" "}
          <Mail to={LEGAL.support} />.
        </p>
      </>
    ),
  },
];

export default function Guidelines() {
  return (
    <LegalPage
      title="Community Guidelines"
      lede="The house rules. Be real, be decent, and keep it out of the gutter in the group."
      sections={sections}
      dated={false}
    />
  );
}
