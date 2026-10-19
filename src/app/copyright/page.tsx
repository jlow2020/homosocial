import type { Metadata } from "next";
import LegalPage, { Mail, type Section } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Copyright | Homosocial",
  description: "How to report copyright infringement on Homosocial.",
};

const sections: Section[] = [
  {
    id: "notice",
    title: "Reporting infringement",
    body: (
      <>
        <p>
          {LEGAL.company} respects copyright and responds to notices under the Digital Millennium Copyright Act (DMCA). If you
          believe something on Homosocial infringes your copyright, send our designated agent a notice that includes:
        </p>
        <ol>
          <li>your physical or electronic signature;</li>
          <li>a description of the copyrighted work you say is infringed;</li>
          <li>a description of where the material is on Homosocial, detailed enough for us to find it;</li>
          <li>your name, address, phone number and email address;</li>
          <li>a statement that you believe in good faith the use isn&apos;t authorized by the copyright owner, its agent, or the law;</li>
          <li>
            a statement, under penalty of perjury, that the information in your notice is accurate and that you are the owner, or
            are authorized to act for the owner.
          </li>
        </ol>
        <p>
          Send it to our designated copyright agent at <Mail to={LEGAL.legal} /> with &ldquo;DMCA&rdquo; in the subject.
          {LEGAL.mailing ? ` By mail: Copyright Agent, ${LEGAL.company}, ${LEGAL.mailing}.` : ""}
        </p>
      </>
    ),
  },
  {
    id: "counter",
    title: "If your content was removed",
    body: (
      <p>
        If you believe your content was removed by mistake, send a counter-notice to the same address with: your signature; a
        description of what was removed and where it was; a statement under penalty of perjury that you believe in good faith it
        was removed by mistake or misidentification; and your name, address and phone number, with a statement that you consent
        to the jurisdiction of the federal court for your district (or, if you&apos;re outside the U.S., any district where we
        can be found) and will accept service from the person who sent the original notice.
      </p>
    ),
  },
  {
    id: "repeat",
    title: "Repeat infringers",
    body: <p>We close the accounts of members who repeatedly infringe copyright.</p>,
  },
  {
    id: "photos",
    title: "Your own photos",
    body: (
      <p>
        Someone posted a photo of you without permission, or is sharing your private images? That&apos;s against our rules
        whether or not it&apos;s a copyright issue. Report it in the app, or email <Mail to={LEGAL.support} /> with
        &ldquo;Safety&rdquo; in the subject, and we&apos;ll take it down.
      </p>
    ),
  },
];

export default function Copyright() {
  return <LegalPage title="Copyright" lede="How to report infringement, and what to do if we got it wrong." sections={sections} />;
}
