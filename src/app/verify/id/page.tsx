import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import IdCheck from "./IdCheck";
import { getMe } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "ID check | Homosocial" };
export const dynamic = "force-dynamic";

export default async function VerifyId() {
  const me = await getMe();
  if (!me) redirect("/signin");
  if (!me.username) redirect("/account");
  if (!me.profile) redirect("/profile");
  if (!me.profile.verified_at) redirect("/verify");
  if (me.profile.id_verified_at) redirect("/circle");

  return (
    <main>
      <PageHead
        title="One last thing"
        tag={
          <>
            <span className="chy-gold">Grab your seat</span>
            <span className="chy-light">One-time ID check</span>
          </>
        }
        right={<Link href="/circle" className="topbar-link">Back</Link>}
      >
        Everyone in your Circle is a real adult, checked once. We read your ID and match its photo to your
        Realness Check, then delete the photos. We keep your birthday and that you passed. Nothing else.
      </PageHead>
      <IdCheck />
    </main>
  );
}
