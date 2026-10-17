import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import RealnessCheck from "./RealnessCheck";
import { getMe } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Realness Check | Homosocial" };
export const dynamic = "force-dynamic";

export default async function Verify() {
  const me = await getMe();
  if (!me) redirect("/join");
  if (!me.profile) redirect("/profile");
  if (me.profile.verified_at) redirect("/circle");

  return (
    <main className="apply-page">
      <PageHead
        title="Realness Check"
        tag={<><span className="chy-hot">Step 2 of 2</span><span className="chy-light">20 seconds</span></>}
        right={<Link href="/profile" className="topbar-link">Profile</Link>}
      >
        Everyone in your Circle is a real person who looks like his photo.
        That&apos;s what this is for.
      </PageHead>
      <RealnessCheck firstName={me.profile.first_name} />
    </main>
  );
}
