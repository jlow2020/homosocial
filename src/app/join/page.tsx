import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import JoinForm from "./JoinForm";
import { getMe, nextPath } from "@/lib/supabase-server";
import { SEASON } from "@/lib/season";

export const metadata: Metadata = { title: `Join ${SEASON.name} | Homosocial` };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  google: "Google sign-in didn't work. Try again or use your email.",
  link: "That sign-in link expired or was already used. Get a new one below.",
  setup: "Sign-in isn't connected yet.",
};

export default async function Join({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getMe();
  if (me) redirect(nextPath(me.profile));
  const { error } = await searchParams;

  return (
    <main className="apply-page">
      <PageHead title={`Join ${SEASON.name}`}>
        Free. Takes about three minutes: sign in, make your profile, and do a
        quick Realness Check with your camera. Then you&apos;re in a Circle.
      </PageHead>
      {error && errors[error] && (
        <div className="wrap" style={{ maxWidth: 680, paddingTop: 32 }}>
          <p className="error" role="alert">
            {errors[error]}
          </p>
        </div>
      )}
      <JoinForm google={process.env.GOOGLE_SIGNIN === "on"} />
    </main>
  );
}
