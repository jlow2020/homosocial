import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Mail, type Section } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Help and contact | Homosocial",
  description: "How to reach Homosocial for help, privacy requests, safety reports and legal notices.",
};

const sections: Section[] = [
  {
    id: "help",
    title: "Help with your account",
    body: (
      <>
        <p>
          Email <Mail to={LEGAL.support} />. We usually answer within two business days. Include your username (never your
          password).
        </p>
        <ul>
          <li><b>Forgot your password?</b> Use &ldquo;Forgot it?&rdquo; on the <Link href="/signin">sign-in page</Link>.</li>
          <li><b>Realness Check or ID check failing?</b> Good light, no glare, fill the frame. Still stuck? Email us.</li>
          <li><b>Delete your account:</b> Profile, then Delete my account at the bottom. It can&apos;t be undone.</li>
          <li><b>Notifications:</b> turn them on or off from your Profile.</li>
        </ul>
      </>
    ),
  },
  {
    id: "safety",
    title: "Safety reports",
    body: (
      <p>
        Fastest: report him from his card, an answer, or a DM, right in the app. For anything urgent, email{" "}
        <Mail to={LEGAL.support} /> with &ldquo;Safety&rdquo; in the subject. In an emergency, call 911. More on the{" "}
        <Link href="/safety">Safety</Link> page.
      </p>
    ),
  },
  {
    id: "privacy",
    title: "Privacy requests",
    body: (
      <p>
        To get a copy of your data, correct it, or delete it, email <Mail to={LEGAL.privacy} />. See the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    id: "legal",
    title: "Legal notices and copyright",
    body: (
      <p>
        {LEGAL.company}: <Mail to={LEGAL.legal} />.{LEGAL.mailing ? ` Mail: ${LEGAL.mailing}.` : ""} Copyright complaints: see the{" "}
        <Link href="/copyright">Copyright</Link> page. Law enforcement requests must come from an official agency email address
        to <Mail to={LEGAL.legal} />.
      </p>
    ),
  },
];

export default function Contact() {
  return <LegalPage title="Help and contact" lede="Real people answer these. Here's where to send what." sections={sections} dated={false} />;
}
