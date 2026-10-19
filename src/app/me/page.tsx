import { redirect } from "next/navigation";
import { getMe, nextPath } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Sends a signed-in member to whatever step he's on.
export default async function Me() {
  const me = await getMe();
  if (!me) redirect("/signin");
  redirect(nextPath(me.profile, me.username, me.terms));
}
