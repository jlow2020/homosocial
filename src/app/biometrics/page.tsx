import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Mail, type Section } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Biometric and ID Notice | Homosocial",
  description: "How Homosocial uses face matching and ID checks to verify members, what's kept, and when it's destroyed.",
};

const C = LEGAL.company;

const sections: Section[] = [
  {
    id: "why",
    title: "Why we do this",
    body: (
      <p>
        Every Homosocial member is a real, verified adult who looks like his photos. That&apos;s the promise of the Service, and
        the only way to keep it is to check. We use face matching for exactly two purposes:{" "}
        <b>to confirm you&apos;re a live person who matches your profile photo, and to confirm you&apos;re over 18 and the owner of
        the ID you show us.</b> We don&apos;t use it for anything else: no advertising, no profiling, no identifying you
        anywhere else, no training AI models.
      </p>
    ),
  },
  {
    id: "realness",
    title: "The Realness Check",
    body: (
      <>
        <p>
          Your phone records a few seconds of video while you follow on-screen prompts. Software running <b>on your device</b>{" "}
          checks that a live person is there, estimates a minimum age, and compares your face to your profile photo. Your device
          then sends us six still frames and the resulting scores.
        </p>
        <p>
          On our server, we compare the frames to your profile photo again, so the result can&apos;t be faked. To compare faces,
          software calculates a set of numbers from each face (sometimes called a face template or face geometry), compares
          them, and <b>discards them right away. We never store face templates or face geometry.</b>
        </p>
        <p>We keep: the six frames (for a limited time, below), the scores, and whether you passed.</p>
      </>
    ),
  },
  {
    id: "id",
    title: "The ID check",
    body: (
      <>
        <p>
          You take photos of the front and, for a license or ID card, the back of your government ID. Our server reads the
          barcode or the machine-readable lines, checks the dates, and compares the photo on your ID to your Realness Check frames
          and your profile photo, the same way as above.
        </p>
        <p>
          <b>The images of your ID are processed in memory and never saved.</b> Your ID number is used once, to create a
          scrambled one-way fingerprint (a keyed hash) that can&apos;t be turned back into the number. We use that fingerprint
          only to stop one ID from opening two accounts.
        </p>
        <p>
          We keep: your date of birth (it replaces the one you typed), the document type, the issuing state or country, the
          face-match score, the date you passed, and the fingerprint.
        </p>
      </>
    ),
  },
  {
    id: "kept",
    title: "Retention and destruction schedule",
    body: (
      <ul>
        <li><b>Face templates and face geometry:</b> never stored. Discarded as soon as each comparison is done.</li>
        <li><b>ID images and ID numbers:</b> never stored.</li>
        <li>
          <b>Realness Check frames:</b> permanently deleted as soon as your ID check passes, or 90 days after your Realness Check
          if you never finish it, whichever comes first.
        </li>
        <li>
          <b>Scores, ID details and the ID fingerprint:</b> kept while your account is open, and permanently deleted when you
          delete your account. One exception: if your account was banned, we keep only the ID fingerprint, so a banned person
          can&apos;t rejoin with the same ID.
        </li>
        <li>
          In every case we destroy this information no later than the time the law requires, including when the purpose for
          collecting it has been met, and in any event within three years of your last use of the Service.
        </li>
      </ul>
    ),
  },
  {
    id: "access",
    title: "Who can access it",
    body: (
      <>
        <p>
          <b>We never sell, lease, trade, or otherwise profit from your face images or ID information.</b> Other members never
          see your verification frames or ID details.
        </p>
        <p>
          Our storage and hosting providers (Supabase and Railway) store and process it for us under contract, only to run the
          Service. A small number of our moderators may view your Realness Check frames to resolve a failed check, an appeal, or
          a report that an account is fake. We disclose it to anyone else only if you agree, or if the law, a valid subpoena, or a
          court order requires it.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        Verification frames are kept in private storage that no member and no public link can reach, and are encrypted in
        transit. We protect this information with at least the same care we use for our own most sensitive information, and to
        the standard of care reasonable in our industry.
      </p>
    ),
  },
  {
    id: "consent",
    title: "Your consent and choices",
    body: (
      <>
        <p>
          Before your first Realness Check, we ask you to agree to this notice in writing (by checking a box), and we record when
          you agreed. The checks are required to get a seat in a Circle. If you don&apos;t want to do them, you can&apos;t join a
          Circle.
        </p>
        <p>
          You can withdraw your consent at any time by deleting your account, which deletes everything above (except a banned
          account&apos;s ID fingerprint). Questions or requests: <Mail to={LEGAL.privacy} />.
        </p>
      </>
    ),
  },
  {
    id: "more",
    title: "More",
    body: (
      <p>
        This notice is part of our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.
        {" "}{C}.
      </p>
    ),
  },
];

export default function Biometrics() {
  return (
    <LegalPage
      title="Biometric and ID Notice"
      lede="How we prove every member is a real adult who looks like his photos, and exactly what we keep."
      summary={[
        "We compare faces only to verify you. Nothing else, ever.",
        "Face measurements are calculated, compared, and thrown away. Never stored.",
        "Pictures of your ID and your ID number are never stored.",
        "Your selfie frames are deleted once your ID check passes, or after 90 days.",
        "We never sell or share any of it. Delete your account and it's gone.",
      ]}
      sections={sections}
    />
  );
}
