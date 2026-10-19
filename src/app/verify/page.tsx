import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import RealnessCheck from "./RealnessCheck";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import BiometricConsent from "@/components/BiometricConsent";
import { hasConsent } from "@/lib/consent";
import { BIOMETRIC_VERSION, TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = { title: "Realness Check | Homosocial" };
export const dynamic = "force-dynamic";

export default async function Verify({ searchParams }: { searchParams: Promise<{ consent?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/signin");
  if (!me.username) redirect("/account");
  if (me.terms !== TERMS_VERSION) redirect("/agree");
  if (!me.profile) redirect("/profile");
  if (me.profile.verified_at) redirect("/circle");
  const agreed = await hasConsent(getSupabaseAdmin()!, me.userId, "biometric", BIOMETRIC_VERSION);
  const { consent } = await searchParams;

  return (
    <main className="apply-page">
      <PageHead
        title="Realness Check"
        tag={<><span className="chy-hot">Step 3 of 3</span><span className="chy-light">20 seconds</span></>}
        right={<Link href="/profile" className="topbar-link">Profile</Link>}
      >
        Everyone in your Circle is a real person who looks like his photo.
        That&apos;s what this is for.
      </PageHead>
      {agreed ? <RealnessCheck firstName={me.profile.first_name} /> : <BiometricConsent back="/verify" missing={consent === "missing"} />}
    </main>
  );
}
