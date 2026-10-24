import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Mail, type Section } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | Homosocial",
  description: "What Homosocial collects, why, who sees it, and how to delete it.",
};

const C = LEGAL.company;

const sections: Section[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <p>
        {C} (&ldquo;Homosocial,&rdquo; &ldquo;we&rdquo;) runs {LEGAL.site} and the Homosocial apps. This policy explains what we
        collect, why, who can see it, how long we keep it, and what you can do about it. Questions:{" "}
        <Mail to={LEGAL.privacy} />.
      </p>
    ),
  },
  {
    id: "sensitive",
    title: "We know this is sensitive",
    body: (
      <>
        <p>
          Homosocial is for gay, bi, trans and queer men. Simply having an account can reveal your sexual orientation, and
          sometimes your gender identity. Your answers, messages and photos may describe your sex life, your health, or other
          private things. We also use face matching to verify members.
        </p>
        <p>
          We treat all of it as sensitive information. <b>We collect it only to run the Service, we never sell it, we never
          share it for advertising, and we never give it to data brokers.</b> By creating an account, you consent to us
          processing it as this policy describes. You can withdraw that consent at any time by deleting your account.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <p>
          <b>Your account.</b> Your email address, username, and password (stored only as a one-way hash by our sign-in
          provider, so we can&apos;t read it). If you sign in with Google, we get your email address and basic profile from
          Google.
        </p>
        <p>
          <b>Your profile.</b> First name, birthday, zip code (we use it to place you in a nearby Circle), interests, hot take,
          whether you&apos;re open to dating, and your profile photo.
        </p>
        <p>
          <b>Verification.</b> Still frames from your Realness Check, face-match and liveness scores, and from your ID check: your
          date of birth, the document type, the state or country that issued it, its expiration date, a face-match score, and a
          scrambled one-way fingerprint of the document number. <b>We don&apos;t keep images of your ID, your ID number, or face
          measurements.</b> The details are in the <Link href="/biometrics">Biometric and ID Notice</Link>.
        </p>
        <p>
          <b>What you do in the game.</b> Your answers to drops, photos, videos and voice memos you post, reactions, replies,
          Lounge messages, plans and RSVPs, Roses, Finale picks and setups, guesses and votes in games, heat votes, drops you
          write, badges, and the Season you&apos;re in.
        </p>
        <p>
          <b>Private messages.</b> The messages, photos and videos you send and receive, reactions, when messages were read, and
          your photo and video settings for each chat.
        </p>
        <p>
          <b>Safety records.</b> Who you&apos;ve blocked, reports you make, reports about you, and moderator notes and actions on
          your account.
        </p>
        <p>
          <b>Agreements.</b> When you agree to our Terms or to face matching, we save the date, which version you agreed to, your
          IP address, and your browser or device type, so we can prove what you agreed to.
        </p>
        <p>
          <b>Notifications.</b> If you turn on push notifications, the address your browser or phone gives us for sending them,
          plus your email alert setting.
        </p>
        <p>
          <b>Technical data.</b> Our hosting providers keep standard server logs: IP address, device and browser type, pages
          requested, and timestamps. We use cookies only to keep you signed in. <b>We don&apos;t use advertising cookies,
          tracking pixels, analytics trackers, or cross-site tracking of any kind.</b>
        </p>
        <p>
          <b>Location.</b> We don&apos;t collect your precise location. Before videos and voice memos are shown to anyone, we
          convert them and strip their embedded data, including any location your phone stamped on them. Photos are re-saved on
          your device before upload, which also drops location data.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <ul>
        <li>to create your account, verify you&apos;re a real adult, and keep each person to one account;</li>
        <li>to place you in a Circle and run the game: drops, games, results, badges, the Sunday Read and the Finale;</li>
        <li>to deliver your messages and send you the notifications you&apos;ve allowed;</li>
        <li>
          to keep members safe: review reports, enforce our rules, and prevent fraud, abuse and spam. This includes automated
          checks, described under &ldquo;Who sees what&rdquo;;
        </li>
        <li>to keep the Service working, secure, and fix problems;</li>
        <li>to follow the law and respond to valid legal requests;</li>
        <li>to work out totals across Circles (like the Census), which never show any one person&apos;s answers.</li>
      </ul>
    ),
  },
  {
    id: "see",
    title: "Who sees what",
    body: (
      <>
        <p>
          <b>Your Circle sees</b> your first name, age (not your birthday), interests, hot take, photo, badges and Founder
          number, and the answers, reactions, replies, plans, Roses and messages you post to the Circle.
        </p>
        <p>
          <b>Your Circle never sees</b> your email, username, zip code, birthday, whether you&apos;re open to dating, your ID
          details, your verification frames, who you blocked or reported, or your Finale picks (only picks that go both ways
          are revealed, to the two people involved).
        </p>
        <p>
          <b>Anonymous features</b> hide your name from other members, not from us. Our moderators can see who posted
          anything, so they can act on reports.
        </p>
        <p>
          <b>Private messages</b> are seen by you and the person you&apos;re talking to. They aren&apos;t end-to-end encrypted.
          Our moderators may review a chat when it&apos;s reported, when we have a safety concern, or when the law requires it.
          We don&apos;t browse your messages otherwise.
        </p>
        <p>
          <b>Automated safety checks.</b> Posts and private messages are checked automatically, by software on our own servers,
          for a short list of serious problems: selling sex, drugs, minors, threats, hate, and spam. Photos and videos posted to
          shared spaces are also checked for nudity the rules don&apos;t allow. Explicit photos in private messages, which are
          allowed with consent, are not checked for nudity. When a check is unsure, the text or photo may be sent to our AI
          provider for a second opinion, and a moderator may review it. Nothing is removed and no strike is given without a
          person deciding.
        </p>
        <p>
          <b>Guys in the lobby</b> who haven&apos;t done their ID check yet see only first names, ages and interests, not faces
          or hot takes.
        </p>
        <p>Your photos and media are stored privately. They aren&apos;t public links and search engines can&apos;t find them.</p>
      </>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <p>
          <b>We don&apos;t sell or rent personal information, and we don&apos;t share it for targeted advertising.</b> We share
          it only with:
        </p>
        <ul>
          <li>
            <b>Service providers</b> who run parts of the Service for us and may use your information only to do that: Supabase
            (database, sign-in and file storage), Railway (website hosting), Resend (email delivery), and the push services built
            into your browser or phone, such as Apple, Google or Mozilla (delivering notifications; the contents of our
            notifications are encrypted so the push service can&apos;t read them). Google, if you choose to sign in with Google.
            Anthropic, our AI provider, for two things only: a second opinion on the borderline posts and photos described
            under &ldquo;Automated safety checks,&rdquo; and, while you build your profile, drafting prompt answers for you to
            pick from, using the interests, plans and profile text you&apos;ve entered. You choose what, if anything, gets
            posted.
          </li>
          <li>
            <b>Law enforcement and others, when required.</b> When the law requires it, such as a valid subpoena or court
            order; to report child sexual exploitation to the National Center for Missing &amp; Exploited Children; or when we
            believe in good faith it&apos;s needed to prevent death or serious harm. We push back on requests that are too broad
            and, where we&apos;re allowed, we tell you first.
          </li>
          <li>
            <b>A new owner.</b> If {C} is merged, sold or reorganized, your information may move to the new owner, who must
            honor this policy or get your consent to change it.
          </li>
          <li><b>Anyone else, only with your permission.</b></li>
        </ul>
      </>
    ),
  },
  {
    id: "keep",
    title: "How long we keep it",
    body: (
      <ul>
        <li><b>While your account is open</b>, we keep your profile and what you&apos;ve posted.</li>
        <li>
          <b>Realness Check frames</b> are deleted as soon as your ID check passes, or 90 days after your Realness Check if you
          never do it.
        </li>
        <li><b>ID images</b> are never stored. They&apos;re read in memory and discarded.</li>
        <li>
          <b>When you delete your account</b>, we delete your profile, photos, verification records, answers, media, and every
          private chat you were in (for both people), along with that chat&apos;s photos and videos. Copies in backups are
          overwritten within about 30 days.
        </li>
        <li>
          <b>Drops you wrote</b> stay in our drop bank without your name, as the <Link href="/terms#content">Terms</Link>{" "}
          explain.
        </li>
        <li>
          <b>If you were banned</b>, we keep only the scrambled fingerprint of your ID, so the same ID can&apos;t open a new
          account.
        </li>
        <li>
          <b>Legal holds.</b> We keep information longer only when the law requires it, or for an active investigation of
          serious harm.
        </li>
      </ul>
    ),
  },
  {
    id: "rights",
    title: "Your choices and rights",
    body: (
      <>
        <ul>
          <li><b>See and fix it.</b> Edit your profile any time. Ask us for a copy of your data at <Mail to={LEGAL.privacy} />.</li>
          <li><b>Delete it.</b> Delete your account from your profile page, or ask us to.</li>
          <li><b>Withdraw consent.</b> Deleting your account withdraws consent for sensitive and biometric information.</li>
          <li><b>Notifications.</b> Turn push and email alerts on or off from your profile.</li>
          <li>
            <b>Appeal.</b> If we turn down a privacy request, reply to tell us you&apos;re appealing, and someone else will review
            it.
          </li>
        </ul>
        <p>
          Depending on where you live, you may have more rights under state law, such as the right to know, correct, delete, or
          take a copy of your data, and to opt out of sale, targeted advertising, or profiling. We give these rights to every
          member, wherever you live. We don&apos;t sell data or do targeted advertising, so there&apos;s nothing to opt out of
          there. We&apos;ll answer within 45 days, and we won&apos;t treat you differently for asking. We may need to confirm
          it&apos;s really you before acting on a request.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We protect your information with encryption in transit, private storage, access limited to a small number of
        moderators, and audit logs of moderator actions. No system is perfectly secure. If a breach affects your personal
        information, we&apos;ll tell you and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: "adults",
    title: "Adults only",
    body: (
      <p>
        Homosocial is only for people 18 and older, and every member&apos;s age is checked against a government ID. We don&apos;t
        knowingly collect information from anyone under 18. If we learn we have, we delete it and close the account. If you
        think a minor is on Homosocial, report him in the app or email <Mail to={LEGAL.support} />.
      </p>
    ),
  },
  {
    id: "where",
    title: "Where your data is",
    body: (
      <p>
        Homosocial operates from the United States, and is currently only open in the United States. Your information is processed in the
        United States and wherever our service providers run their systems, with protections required by our contracts with
        them.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        If we change this policy in a way that matters, we&apos;ll tell you through the Service or by email before the change
        takes effect. We will never start selling your data or using it for advertising without asking you first.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Privacy questions and requests: <Mail to={LEGAL.privacy} />. {C}.
        {LEGAL.mailing ? ` Mail: ${LEGAL.mailing}.` : ""}
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      lede="What we collect, why, who sees it, and how to make it disappear."
      summary={[
        "Being on Homosocial can reveal your orientation. We treat everything here as sensitive.",
        "We never sell your data, never share it for ads, and use no tracking cookies or analytics.",
        "We never keep pictures of your ID, your ID number, or face measurements.",
        "Your Circle never sees your email, username, zip, birthday, ID, or Finale picks.",
        "Anonymous means anonymous to members. Moderators can see who posted, to handle reports.",
        "Delete your account and your profile, photos, posts and chats go with it.",
      ]}
      sections={sections}
    />
  );
}
