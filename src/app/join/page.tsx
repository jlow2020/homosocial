import type { Metadata } from "next";
import { pickCard, shareMetadata } from "@/lib/og";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import JoinForm from "./JoinForm";
import { getMe, nextPath } from "@/lib/supabase-server";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ card?: string }> }): Promise<Metadata> {
  const { card } = await searchParams;
  return { title: "Join a Circle | Homosocial", ...shareMetadata(pickCard(card), "Join a Circle | Homosocial", undefined, "/join") };
}
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  google: "Google sign-in didn't work. Try again or use your email.",
  link: "That sign-in link expired or was already used. Links last an hour and work once. Get a fresh one below.",
  setup: "Sign-in isn't connected yet.",
};

export default async function Join({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getMe();
  if (me) redirect(nextPath(me.profile, me.username, me.terms));
  const { error } = await searchParams;

  return (
    <main className="apply-page">
      <PageHead
        title="Join a Circle"
        tag={<span className="chy-light">Free · About 3 minutes</span>}
      >
        Confirm your email, pick a username, make your profile, and do a quick photo check. Then you&apos;re in.
      </PageHead>
      {error && errors[error] && (
        <div className="wrap" style={{ paddingBottom: 24 }}>
          <p className="error" role="alert">
            {errors[error]}
          </p>
        </div>
      )}
      <JoinForm google={process.env.GOOGLE_SIGNIN === "on"} />
    </main>
  );
}
