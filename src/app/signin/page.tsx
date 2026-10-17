import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import SignInForm from "./SignInForm";
import { getMe, nextPath } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Sign in | Homosocial" };
export const dynamic = "force-dynamic";

export default async function SignIn() {
  const me = await getMe();
  if (me) redirect(nextPath(me.profile, me.username));
  return (
    <main>
      <PageHead title="Sign in">Welcome back.</PageHead>
      <SignInForm />
    </main>
  );
}
