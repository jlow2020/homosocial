import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import { getMe } from "@/lib/supabase-server";
import { LEGAL, TERMS_VERSION } from "@/lib/legal";
import { acceptTerms } from "./actions";

export const metadata: Metadata = { title: "The fine print | Homosocial" };
export const dynamic = "force-dynamic";

// Shown once to anyone who hasn't agreed to the current Terms.
export default async function Agree({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/signin");
  if (!me.username) redirect("/account");
  if (me.terms === TERMS_VERSION) redirect("/me");
  const { error } = await searchParams;
  const updated = !!me.terms;

  return (
    <main className="apply-page">
      <PageHead title={updated ? "We updated the fine print" : "The fine print"}>
        {updated
          ? "The Terms changed. Here's what matters, then one tap to keep going."
          : "Before you go further, here's what you're agreeing to. Short version below, full versions linked."}
      </PageHead>
      <div className="wrap prose">
        <ul>
          <li>You&apos;re 18 or older, you&apos;re really you, and you have one account.</li>
          <li>You own what you post. You let us show it to your Circle and run the game with it.</li>
          <li>Nothing explicit where the whole Circle can see (a bare butt is fine). Explicit in DMs only when you both turn photos on, and only of yourself.</li>
          <li>Posts and messages get checked automatically for the serious stuff. Nothing comes down without a person deciding.</li>
          <li>Never share anyone&apos;s photos, messages or identity outside Homosocial. Outing someone gets you banned.</li>
          <li>We never sell your data. Your face scans are used only to prove you&apos;re real and are never stored as face data.</li>
          <li>We don&apos;t run background checks. Meet in public the first time.</li>
          <li>Disputes go to individual arbitration, not class actions. You can opt out within 30 days.</li>
        </ul>
        <form action={acceptTerms} className="stack" style={{ marginTop: 24 }}>
          <label className="agree">
            <input type="checkbox" name="agree" required />
            <span>
              I&apos;m 18 or older and I agree to the <a href="/terms" target="_blank">Terms</a>, the{" "}
              <a href="/privacy" target="_blank">Privacy Policy</a>, and the{" "}
              <a href="/guidelines" target="_blank">Community Guidelines</a>.
            </span>
          </label>
          {error && <p className="error" role="alert">Check the box to keep going.</p>}
          <button className="btn btn-pink btn-full" type="submit">
            Agree and keep going
          </button>
        </form>
        <p className="fine">
          Questions first? Email <a href={`mailto:${LEGAL.legal}`}>{LEGAL.legal}</a>.
        </p>
      </div>
    </main>
  );
}
