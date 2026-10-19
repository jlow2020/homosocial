import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Mail, type Section } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";
import { SEASON, FOUNDER_CAP } from "@/lib/season";

export const metadata: Metadata = {
  title: "Terms of Service | Homosocial",
  description: "The agreement between you and Homosocial LLC.",
};

const C = LEGAL.company;

const sections: Section[] = [
  {
    id: "agreement",
    title: "This agreement",
    body: (
      <>
        <p>
          These Terms of Service (the &ldquo;Terms&rdquo;) are a contract between you and {C}, a {LEGAL.state} limited liability
          company (&ldquo;Homosocial,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). They cover your use of {LEGAL.site}, any Homosocial
          app, and everything we offer through them (together, the &ldquo;Service&rdquo;).
        </p>
        <p>
          By creating an account, checking the box that says you agree, or using the Service, you accept these Terms, our{" "}
          <Link href="/privacy">Privacy Policy</Link>, our <Link href="/biometrics">Biometric and ID Notice</Link>, and our{" "}
          <Link href="/guidelines">Community Guidelines</Link>, which are part of these Terms. If you don&apos;t agree, don&apos;t use the
          Service.
        </p>
        <p>
          <b>
            Section 19 says that most disputes between you and us will be settled by individual binding arbitration, not in court, and
            that you give up the right to bring or join a class action. You can opt out within 30 days. Please read it.
          </b>
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Who can join",
    body: (
      <>
        <p>To use the Service, you must:</p>
        <ul>
          <li>be at least {SEASON.minAge} years old, and old enough to enter a binding contract where you live;</li>
          <li>be a man who is gay, bi, trans, queer, or otherwise into men, as you define yourself;</li>
          <li>live in an area where the Service is open (during Season 1, Florida);</li>
          <li>never have been convicted of, or pleaded guilty or no contest to, a sex crime or any crime involving violence or a minor;</li>
          <li>not be required to register as a sex offender anywhere;</li>
          <li>not have been banned from the Service before; and</li>
          <li>not be barred from using the Service under any law that applies to you.</li>
        </ul>
        <p>
          If any of this stops being true, you must stop using the Service and delete your account. We may close any account we
          reasonably believe breaks these rules.
        </p>
      </>
    ),
  },
  {
    id: "verification",
    title: "Proving you're you",
    body: (
      <>
        <p>
          Every member does a Realness Check (a short selfie video matched to his profile photo) and a one-time ID check (a
          government ID matched to his Realness Check) before he gets a seat. How this works, and what we keep, is in the{" "}
          <Link href="/biometrics">Biometric and ID Notice</Link>. You agree to give us true, current information and real
          photos of yourself, and to use only your own ID.
        </p>
        <p>
          <b>
            These checks lower the odds of fake profiles. They don&apos;t guarantee anyone&apos;s identity, age, intentions or
            behavior. We don&apos;t run criminal background checks and we don&apos;t screen members for anything else.
          </b>{" "}
          You&apos;re responsible for your own judgment about who you talk to and meet.
        </p>
        <p>One person, one account. Don&apos;t sell, share, transfer or let anyone else use your account.</p>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <>
        <p>
          You sign in with a username and password. Keep them private. You&apos;re responsible for everything done through your
          account. If you think someone else got in, change your password and email <Mail to={LEGAL.support} /> right away.
        </p>
        <p>
          You can delete your account at any time from your profile page. What happens to your information when you do is in
          the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "game",
    title: "How the game works",
    body: (
      <>
        <p>
          Homosocial is played in Seasons inside small groups called Circles. Each Season runs about eight weeks, with weekly
          prompts (&ldquo;drops&rdquo;), games, group chat, plans, private messages, and a Finale where members make private
          picks and only mutual picks are revealed.
        </p>
        <p>
          We decide which Circle you&apos;re placed in, when a Circle starts, what the drops are, and how features work, and we
          can change any of that at any time. We don&apos;t promise you&apos;ll be placed in a Circle by a certain date, that a
          Circle will fill, or that you&apos;ll get any particular match, friend, date, or result. Badges, standings, Roses,
          Finale results, and similar features are part of the game. They aren&apos;t endorsements, ratings of anyone&apos;s
          character, or promises of anything.
        </p>
        <p>
          Some features hide your name from other members (for example, anonymous drops, Guess Who, Two Truths and a Lie, and
          Blind Date). Your identity is hidden from other members, not from us. We can see who posted what, and we may act on
          it under these Terms. In Blind Date, names and faces are revealed to your match when the week ends.
        </p>
      </>
    ),
  },
  {
    id: "founders",
    title: "Founders",
    body: (
      <>
        <p>
          The first {FOUNDER_CAP} members in Florida to finish their ID check become Founders, with a numbered badge. If we ever
          charge for a membership or Season Pass, Founders get the standard Season Pass free for as long as {C} operates the
          Service, as long as their account stays in good standing. Founder status is personal. It can&apos;t be sold or
          transferred, and it ends if your account is deleted, or banned for breaking these Terms. Founder status doesn&apos;t
          include future add-ons, premium extras, or merchandise unless we say so in writing.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "What you post",
    body: (
      <>
        <p>
          &ldquo;Your Content&rdquo; means anything you post or send on the Service: answers, photos, videos, voice memos,
          messages, captions, reactions, plans, Roses, drops you write, and your profile. You keep ownership of Your Content.
        </p>
        <p>
          You give {C} a worldwide, non-exclusive, royalty-free, sublicensable license to host, store, copy, process, convert,
          resize, display and share Your Content, only as needed to run, improve, secure and moderate the Service. This
          includes showing it to the members it&apos;s meant for (for example, your Circle, or the person you&apos;re
          messaging). This license ends when you delete Your Content or your account, except for: copies other members already
          received in messages that aren&apos;t deleted, backups that expire on their normal schedule, and anything we must keep
          for legal reasons.
        </p>
        <p>
          <b>We will never use your photos, videos, voice or name in advertising without your separate written permission.</b>
        </p>
        <p>
          <b>Drops you write.</b> If you submit a drop through Write the Drop, you give us a perpetual, irrevocable license to use,
          edit and run it in any Circle, now or later, credited by your first name and town (or without credit, if you ask). That
          license survives if you delete your account, but your credit is removed.
        </p>
        <p>You promise that:</p>
        <ul>
          <li>you own Your Content or have every right needed to post it;</li>
          <li>every person shown in a photo or video you post is an adult who agreed to be in it and to have it posted;</li>
          <li>Your Content doesn&apos;t break the law, these Terms, or the Community Guidelines.</li>
        </ul>
        <p>
          We don&apos;t pre-screen everything posted, and we aren&apos;t responsible for what members post. We may review, remove
          or restrict any content, at any time, for any reason we reasonably believe is right, including after reports.
        </p>
      </>
    ),
  },
  {
    id: "explicit",
    title: "Nudity, sexual content and consent",
    body: (
      <>
        <ul>
          <li>
            <b>Shared spaces</b> (drops, the Lounge, Plans, Roses, your profile and anything your Circle can see): no nudity of
            genitals or buttocks and no sexual acts. Underwear and thirst traps are fine.
          </li>
          <li>
            <b>Private messages:</b> explicit photos and videos are allowed only after both of you have turned on photos and
            videos in that chat, only of yourself, and only of you as an adult. Either of you can turn it off at any time.
          </li>
          <li>
            <b>Never</b> post, send, or threaten to share sexual or intimate images of anyone without their consent, including
            images someone sent you privately. Never record, screenshot, save, or share someone else&apos;s private photos,
            videos, or messages outside the Service. This gets you banned for good, and it may be a crime.
          </li>
          <li>
            <b>Zero tolerance for anything sexualizing a minor.</b> We remove it, ban the account, keep what the law requires, and
            report it to the National Center for Missing &amp; Exploited Children and law enforcement.
          </li>
          <li>
            No buying or selling sex, and no offering or asking for anything sexual in exchange for money, gifts, or anything else
            of value.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "conduct",
    title: "Things you can't do",
    body: (
      <>
        <p>
          You agree to follow the <Link href="/guidelines">Community Guidelines</Link>. In addition, you won&apos;t:
        </p>
        <ul>
          <li>harass, threaten, stalk, bully, intimidate, dox or out anyone;</li>
          <li>post hate speech or attack anyone based on race, ethnicity, religion, disability, HIV status, gender identity, sexual orientation, body or age;</li>
          <li>impersonate anyone, misrepresent your identity, age, or photos, or create more than one account;</li>
          <li>use the Service for spam, scams, advertising, recruiting, MLM, fundraising, or selling anything, including drugs;</li>
          <li>ask anyone for money, financial details, or passwords;</li>
          <li>collect other members&apos; information, scrape, crawl, or copy the Service by automated means;</li>
          <li>reverse engineer, hack, overload, probe, or get around any security, verification, or access control;</li>
          <li>use the Service to do anything illegal, or to help anyone else do so;</li>
          <li>use anything from the Service to train artificial intelligence models, or run it through such models to identify anyone.</li>
        </ul>
      </>
    ),
  },
  {
    id: "safety",
    title: "Meeting people in real life",
    body: (
      <>
        <p>
          Homosocial is built to help you meet people, and that comes with real-world risk. We don&apos;t control what members do
          on or off the Service, and we aren&apos;t responsible for anyone&apos;s conduct. Use good judgment, read our{" "}
          <Link href="/safety">Safety</Link> page, meet in public the first time, and tell a friend where you&apos;ll be.
        </p>
        <p>
          To the fullest extent the law allows, you release {C} and its owners, members, managers, employees and agents from
          claims, losses and damages that come from your interactions with other members, on or off the Service. If you&apos;re a
          California resident, you waive California Civil Code section 1542, which says: &ldquo;A general release does not extend
          to claims that the creditor or releasing party does not know or suspect to exist in his or her favor at the time of
          executing the release and that, if known by him or her, would have materially affected his or her settlement with the
          debtor or released party.&rdquo;
        </p>
      </>
    ),
  },
  {
    id: "moderation",
    title: "Reports, moderation and bans",
    body: (
      <>
        <p>
          You can block or report any member, and report any answer or message. Reports are confidential: the person you report
          isn&apos;t told who reported him. When enough different members report an account or an answer, it may be paused or
          hidden automatically until a moderator reviews it.
        </p>
        <p>
          We may warn you, remove content, limit features, pause, or permanently ban your account, with or without notice, if
          we reasonably believe you&apos;ve broken these Terms or the Guidelines, put anyone at risk, or exposed us to legal
          liability. If you think we got it wrong, email <Mail to={LEGAL.support} /> and a person will look at it.
        </p>
        <p>
          If your account is banned, we keep a one-way scrambled fingerprint of your ID so it can&apos;t be used to open a new
          account, as described in the <Link href="/biometrics">Biometric and ID Notice</Link>.
        </p>
      </>
    ),
  },
  {
    id: "messages",
    title: "Notifications and email",
    body: (
      <p>
        By joining, you agree that we can send you service messages: sign-in links, alerts about your Circle, your messages, and
        changes to these Terms. If you turn on push notifications, we&apos;ll send those too. You can turn push and email alerts
        off from your profile, but some account and legal messages can&apos;t be turned off. We don&apos;t send marketing email
        unless you opt in.
      </p>
    ),
  },
  {
    id: "fees",
    title: "Price",
    body: (
      <p>
        The Service is free right now. If we add paid features, we&apos;ll tell you the price and terms before you pay anything,
        and nothing you get for free today will be charged to you without your agreement. Purchases made through an app store are
        handled by that store under its own terms.
      </p>
    ),
  },
  {
    id: "ours",
    title: "Our stuff",
    body: (
      <p>
        The Service, including its name, logos, design, games, drops we write, code and everything else we make, belongs to{" "}
        {C} or our licensors and is protected by law. We give you a personal, revocable, non-transferable, non-exclusive license
        to use the Service for its intended purpose under these Terms. If you send us ideas or feedback, we can use them without
        owing you anything.
      </p>
    ),
  },
  {
    id: "copyright",
    title: "Copyright complaints",
    body: (
      <p>
        We respect copyright and we close the accounts of repeat infringers. If you think something on the Service infringes your
        copyright, follow the steps on our <Link href="/copyright">Copyright</Link> page.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Leaving, and ending things",
    body: (
      <p>
        You can stop using the Service and delete your account at any time. We can suspend or end the Service, or your access to
        it, at any time, including if we stop operating. Sections that by their nature should last after the end of this
        agreement will last, including those on Your Content licenses already granted for drops, disclaimers, limits of
        liability, indemnity, and dispute resolution.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        <b>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest extent the law allows, {C}{" "}
          disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose, title and
          non-infringement. We don&apos;t promise the Service will be uninterrupted, secure or error-free, that any content is
          accurate, that verification will catch every fake or underage account, or that any member is who he says he is or will
          behave well.
        </b>
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limits on our liability",
    body: (
      <>
        <p>
          <b>
            To the fullest extent the law allows, {C} and its owners, members, managers, employees and agents will not be liable
            for any indirect, incidental, special, consequential, exemplary or punitive damages, or any loss of profits, data, use,
            or goodwill, or for any damages arising from the conduct of any member or third party, on or off the Service, even if
            we were told such damages were possible.
          </b>
        </p>
        <p>
          <b>
            Our total liability for all claims related to the Service is limited to the greater of (a) the amount you paid us in
            the 12 months before the claim arose, or (b) one hundred U.S. dollars ($100).
          </b>
        </p>
        <p>
          Some places don&apos;t allow some of these limits, so they may not all apply to you. Nothing in these Terms limits
          liability that can&apos;t be limited by law, including for gross negligence or willful misconduct.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "If someone sues us over what you did",
    body: (
      <p>
        You agree to defend, indemnify and hold harmless {C} and its owners, members, managers, employees and agents from any
        claims, losses, damages, liabilities, costs and expenses, including reasonable attorneys&apos; fees, that arise from Your
        Content, your use of the Service, your conduct toward other members, or your breaking these Terms or the law.
      </p>
    ),
  },
  {
    id: "disputes",
    title: "Settling disputes: arbitration and class-action waiver",
    body: (
      <>
        <p>
          <b>Talk to us first.</b> Before filing any claim, email <Mail to={LEGAL.legal} /> with your name, your username, what
          happened and what you want. We&apos;ll try to work it out in good faith for at least 30 days.
        </p>
        <p>
          <b>Arbitration.</b> If we can&apos;t, you and {C} agree that any dispute arising out of or relating to these Terms or
          the Service will be resolved by final, binding, individual arbitration administered by the American Arbitration
          Association under its Consumer Arbitration Rules, instead of in court. The Federal Arbitration Act governs this section.
          The arbitrator decides all issues, except that a court decides whether the class-action waiver below is enforceable.
          Arbitration may be held by video or phone, or in {LEGAL.county}, or in the county where you live if you prefer. We will
          pay the filing, administration and arbitrator fees beyond what you would pay to file in court, unless the arbitrator
          finds your claim frivolous.
        </p>
        <p>
          <b>Exceptions.</b> Either of us may bring an individual claim in small claims court if it qualifies. Either of us may go
          to court to stop infringement or misuse of intellectual property, or unauthorized access to the Service. Nothing here
          stops you from reporting anything to a government agency.
        </p>
        <p>
          <b>No class actions.</b> You and {C} may bring claims against each other only individually, never as a plaintiff or
          class member in any class, collective, consolidated or representative proceeding. The arbitrator can&apos;t combine
          claims of more than one person. <b>You and we both give up the right to a jury trial.</b>
        </p>
        <p>
          <b>30-day opt-out.</b> You can opt out of this arbitration agreement by emailing <Mail to={LEGAL.legal} /> within 30
          days of first agreeing to these Terms, with your name, username and a clear statement that you opt out of arbitration.
          Opting out doesn&apos;t affect anything else in these Terms.
        </p>
        <p>
          <b>If this section doesn&apos;t apply.</b> If you opt out, or if this section is found unenforceable, any dispute will be
          decided only in the state or federal courts located in {LEGAL.county}, and you and we agree to the jurisdiction of those
          courts.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These Terms are governed by the laws of the State of {LEGAL.state} and applicable U.S. federal law, without regard to
        conflict-of-law rules. Any claim must be brought within one year after it arises, or it&apos;s permanently barred, to the
        extent the law allows.
      </p>
    ),
  },
  {
    id: "apple",
    title: "If you use our app from an app store",
    body: (
      <>
        <p>If you download a Homosocial app from Apple&apos;s App Store or Google Play, these extra terms apply:</p>
        <ul>
          <li>
            These Terms are between you and {C} only, not Apple or Google. {C}, not Apple or Google, is responsible for the app
            and its content.
          </li>
          <li>Your license to use the app is limited to devices you own or control, as the store&apos;s rules allow.</li>
          <li>Apple and Google have no obligation to provide maintenance or support for the app.</li>
          <li>
            If the app fails to conform to any warranty that applies, you may notify Apple, and Apple will refund the purchase
            price, if any. To the extent the law allows, Apple has no other warranty obligation for the app.
          </li>
          <li>
            {C}, not Apple, is responsible for addressing any claims relating to the app, including product liability claims,
            claims that the app fails to meet legal or regulatory requirements, and consumer protection or privacy claims.
          </li>
          <li>{C}, not Apple, is responsible for investigating and resolving any claim that the app infringes someone&apos;s intellectual property.</li>
          <li>
            You confirm you aren&apos;t located in a country under a U.S. government embargo or designated as supporting terrorism,
            and you aren&apos;t on any U.S. government list of prohibited or restricted parties.
          </li>
          <li>You must follow the store&apos;s terms of service when using the app.</li>
          <li>Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them against you.</li>
        </ul>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms. If a change is material, we&apos;ll tell you ahead of time through the Service or by email, and
        ask you to agree again before you keep playing. Changes to the arbitration section won&apos;t apply to disputes already
        filed. If you don&apos;t agree to new Terms, stop using the Service and delete your account.
      </p>
    ),
  },
  {
    id: "misc",
    title: "The rest",
    body: (
      <p>
        These Terms, with the documents they mention, are the whole agreement between you and us about the Service. If any part is
        unenforceable, the rest stays in effect. If we don&apos;t enforce something right away, we haven&apos;t given up the right
        to. You can&apos;t transfer your rights under these Terms. We can, for example in a merger or sale. Headings are for
        convenience only.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        {C}. Help: <Mail to={LEGAL.support} />. Legal notices: <Mail to={LEGAL.legal} />.
        {LEGAL.mailing ? ` Mail: ${LEGAL.mailing}.` : " Mailing address for legal notices available on request."}
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      lede="The agreement between you and Homosocial. Long, because it has to be. The short version comes first."
      summary={[
        `You're ${SEASON.minAge}+, really you, and on one account.`,
        "You own what you post. We use it to run the game, and never in ads without asking.",
        "Nothing explicit where the Circle can see. In DMs only with mutual consent, and only of yourself.",
        "Sharing someone's private photos, messages or identity gets you banned for good.",
        "We don't do background checks. Meet in public, use your judgment.",
        "Break the rules and we can remove content or ban you.",
        "Disputes go to individual arbitration, no class actions. Opt out within 30 days by email.",
      ]}
      sections={sections}
    />
  );
}
