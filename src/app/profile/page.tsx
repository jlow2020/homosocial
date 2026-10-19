import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import ProfileForm from "./ProfileForm";
import PushPrompt from "@/components/PushPrompt";
import EmailToggle from "@/components/EmailToggle";
import { deleteAccount } from "./actions";
import { signOut } from "@/app/join/actions";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Your profile | Homosocial" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await getMe();
  if (!me) redirect("/signin");
  if (!me.username) redirect("/account");
  const p = me.profile;

  let photoUrl: string | null = null;
  if (p?.photo_path) {
    const { data } = await getSupabaseAdmin()!
      .storage.from("photos")
      .createSignedUrl(p.photo_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="apply-page">
      <PageHead
        title={p ? "Your profile" : "Make your profile"}
        tag={p ? undefined : <><span className="chy-hot">Step 2 of 3</span><span className="chy-light">Your profile</span></>}
        right={
          <form action={signOut}>
            <button className="topbar-link link-button" type="submit">Sign out</button>
          </form>
        }
      >
        {p
          ? "This is what your Circle sees, except your birthday, zip, and what you're looking for."
          : "This is what your Circle sees. Your birthday, zip, and what you're looking for stay private."}
      </PageHead>
      <ProfileForm
        photoUrl={photoUrl}
        initial={
          p && {
            first_name: p.first_name,
            birthdate: p.birthdate,
            zip: p.zip,
            interests: p.interests,
            looking_for: p.looking_for,
            hot_take: p.hot_take,
          }
        }
      />
      {p && (
        <div className="wrap account-link">
          <h2 className="admin-h3" style={{ marginTop: 0 }}>Alerts</h2>
          <PushPrompt compact />
          <EmailToggle on={(p as { notify_email?: boolean }).notify_email !== false} />
        </div>
      )}
      {p && (
        <div className="wrap account-link">
          <p>
            Signed in as <strong>@{me.username}</strong>. <a href="/account">Change your password</a>
          </p>
        </div>
      )}
      {p && (
        <div className="wrap danger">
          <details>
            <summary>Delete my account</summary>
            <p>
              This removes your profile, your photos, and your Realness Check
              for good. You&apos;ll leave your Circle and it can&apos;t be undone.
            </p>
            <form action={deleteAccount}>
              <button className="btn btn-danger" type="submit">Delete my account</button>
            </form>
          </details>
        </div>
      )}
    </main>
  );
}
