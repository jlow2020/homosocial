import type { Metadata } from "next";
import { pickCard, shareMetadata } from "@/lib/og";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import JoinForm from "./JoinForm";
import { getMe, nextPath } from "@/lib/supabase-server";
import { SEASON } from "@/lib/season";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ card?: string }> }): Promise<Metadata> {
  const { card } = await searchParams;
  return { title: "Grab a seat | Homosocial", ...shareMetadata(pickCard(card), "Grab a seat | Homosocial", undefined, "/join") };
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
        title="Grab a seat"
        tag={
          <>
            <span className="chy-hot">Doors open</span>
            <span className="chy-light">{SEASON.name}</span>
          </>
        }
      >
        Free. Takes about three minutes: confirm your email, pick a username
        and password, make your profile, and do a quick Realness Check with
        your camera. Then you&apos;re in a Circle.
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
