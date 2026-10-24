import type { Metadata } from "next";
import LegalPage, { Mail, type Section } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Safety | Homosocial",
  description: "Meeting up, staying safe, and where to get help.",
};

const sections: Section[] = [
  {
    id: "know",
    title: "What our checks do, and don't do",
    body: (
      <p>
        Every member passed a Realness Check and an ID check, so you know he&apos;s a real adult who looks like his photos. That
        tells you nothing about how he&apos;ll act. We don&apos;t run criminal background checks. Trust your gut over any badge.
      </p>
    ),
  },
  {
    id: "meet",
    title: "Meeting up",
    body: (
      <ul>
        <li>Meet somewhere public the first time: a bar, a coffee shop, a Circle plan with other guys.</li>
        <li>Tell a friend who you&apos;re meeting, where, and when you&apos;ll check in.</li>
        <li>Get yourself there and home. Keep your phone charged and your ride options open.</li>
        <li>Watch your drink. Don&apos;t leave it, and don&apos;t take one you didn&apos;t see poured.</li>
        <li>Leave whenever you want. You never owe anyone more time, a ride, or anything else.</li>
        <li>Don&apos;t send money to anyone you met here, for any reason.</li>
      </ul>
    ),
  },
  {
    id: "online",
    title: "Online",
    body: (
      <ul>
        <li>Turn DM photos on only when you want to. You can turn them off again any time.</li>
        <li>Think before you send a face and an explicit photo together.</li>
        <li>Keep chats on Homosocial until you trust someone. Reports and blocks only work here.</li>
        <li>Someone threatening to share your photos? Don&apos;t pay. Report him, save the evidence, and call the line below.</li>
      </ul>
    ),
  },
  {
    id: "health",
    title: "Your health",
    body: (
      <p>
        Know your status and talk about it. Free and low-cost HIV and STI testing, PrEP, and DoxyPEP are available through
        county health departments and LGBTQ+ health centers across the country.
      </p>
    ),
  },
  {
    id: "help",
    title: "Get help",
    body: (
      <ul>
        <li><b>Emergency, or you&apos;re in danger right now:</b> call 911.</li>
        <li><b>Suicide and Crisis Lifeline:</b> call or text 988.</li>
        <li><b>The Trevor Project</b> (LGBTQ+ people under 25): call 1-866-488-7386, or text START to 678-678.</li>
        <li><b>LGBT National Hotline:</b> 1-888-843-4564.</li>
        <li><b>RAINN Sexual Assault Hotline:</b> 1-800-656-4673.</li>
        <li><b>Cyber Civil Rights Initiative</b> (someone shared or is threatening to share your intimate images): 1-844-878-2274.</li>
      </ul>
    ),
  },
  {
    id: "us",
    title: "Tell us",
    body: (
      <p>
        Report anything that feels wrong right in the app, from his card, an answer, or a DM. For anything urgent or serious,
        email <Mail to={LEGAL.support} /> with &ldquo;Safety&rdquo; in the subject line. If you were hurt by someone you met
        here, we&apos;ll work with law enforcement when you report it.
      </p>
    ),
  },
];

export default function Safety() {
  return <LegalPage title="Safety" lede="Meeting up, staying safe, and where to get help." sections={sections} dated={false} />;
}
