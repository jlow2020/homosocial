import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import AccountForm from "./AccountForm";
import { getMe } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Your sign-in | Homosocial" };
export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/signin");
  const { reset } = await searchParams;
  const isNew = !me.username;

  return (
    <main>
      <PageHead
        title={isNew ? "Pick your username" : reset ? "Set a new password" : "Your sign-in"}
        tag={
          isNew ? (
            <>
              <span className="chy-hot">Step 1 of 3</span>
              <span className="chy-light">Your sign-in</span>
            </>
          ) : undefined
        }
        right={!isNew ? <Link href="/me" className="topbar-link">Back</Link> : undefined}
      >
        {isNew
          ? "You're verified. From now on you sign in with a username and password, not email links. Nobody in your Circle sees your username."
          : reset
            ? `You're signed in as @${me.username}. Pick a new password.`
            : "Change your password here."}
      </PageHead>
      <AccountForm username={me.username} />
    </main>
  );
}
