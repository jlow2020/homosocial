import type { Metadata } from "next";
import PageHead from "@/components/PageHead";

export const metadata: Metadata = { title: "House rules | Homosocial" };

export default function Rules() {
  return (
    <main className="apply-page">
      <PageHead title="House rules">
        Short version: be real, be decent, and keep it out of the gutter in the group.
      </PageHead>
      <div className="wrap prose">
        <h2>The rules</h2>
        <ol>
          <li>You&apos;re 18 or older. No exceptions.</li>
          <li>You&apos;re you. Your face, your name, your photos.</li>
          <li>No nudes or explicit photos. Flirting is fine. Porn is not.</li>
          <li>No harassment, hate, or threats, toward anyone, for any reason.</li>
          <li>No selling, recruiting, scams, or spam.</li>
          <li>&ldquo;No&rdquo; and no reply are both answers. Take them.</li>
          <li>Meet new people in public places the first time, and tell a friend where you&apos;ll be.</li>
        </ol>

        <h2>When someone breaks them</h2>
        <p>
          Block him or report him from his card in your Circle. Reporting also
          blocks him, and he never learns who reported him. When three
          different members report the same account, it&apos;s paused
          automatically until it&apos;s reviewed.
        </p>

        <h2>What we keep, and what we don&apos;t</h2>
        <ul>
          <li>Your profile: first name, birthday, zip, interests, hot take, and photo.</li>
          <li>Your Circle sees your first name, age, interests, hot take, and photo. Never your birthday, zip, or email.</li>
          <li>Whether you&apos;re open to dating is never shown to anyone. It only changes what Last Call asks you.</li>
          <li>
            The Realness Check analyzes your face on your own phone. We save
            three photos from it and the pass or fail result. We never save
            face measurements or face templates.
          </li>
          <li>Your photos are stored privately. They aren&apos;t public links and aren&apos;t indexed by search engines.</li>
          <li>Delete your account any time from your profile. That removes your profile and every photo.</li>
        </ul>
      </div>
    </main>
  );
}
