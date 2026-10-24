import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import IdCheck from "./IdCheck";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import BiometricConsent from "@/components/BiometricConsent";
import { hasConsent } from "@/lib/consent";
import { BIOMETRIC_VERSION, TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = { title: "ID check | Homosocial" };
export const dynamic = "force-dynamic";

export default async function VerifyId({ searchParams }: { searchParams: Promise<{ consent?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/signin");
  if (!me.username) redirect("/account");
  if (me.terms !== TERMS_VERSION) redirect("/agree");
  if (!me.profile) redirect("/profile");
  if (!me.profile.verified_at) redirect("/verify");
  if (me.profile.id_verified_at) redirect("/circle");
  const agreed = await hasConsent(getSupabaseAdmin()!, me.userId, "biometric", BIOMETRIC_VERSION);
  const { consent } = await searchParams;

  return (
    <main>
      <PageHead
        title="One last thing"
        tag={
          <>
            <span className="chy-gold">Last step</span>
            <span className="chy-light">One-time ID check</span>
          </>
        }
        right={<Link href="/circle" className="topbar-link">Back</Link>}
      >
        Everyone in your Circle is a real adult, checked once. We read your ID and match its photo to your
        Realness Check. We never keep pictures of your ID or your ID number. We keep your birthday, that you passed, and
        a scrambled fingerprint so one ID can&apos;t open two accounts.
      </PageHead>
      {agreed ? <IdCheck /> : <BiometricConsent back="/verify/id" missing={consent === "missing"} />}
    </main>
  );
}
