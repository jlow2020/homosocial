import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import SignInForm from "./SignInForm";
import { getMe, nextPath, safeNext } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Sign in | Homosocial" };
export const dynamic = "force-dynamic";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const me = await getMe();
  if (me) redirect(next ?? nextPath(me.profile, me.username, me.terms));
  return (
    <main>
      <PageHead title="Sign in">Welcome back.</PageHead>
      <SignInForm next={next} />
    </main>
  );
}
