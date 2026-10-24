import "server-only";
import { TERMS_VERSION } from "@/lib/legal";
import { cookies } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

let admin: SupabaseClient | null = null;

// Next.js reuses identical GET requests within one page render. For the
// database that means a read right after a write can return the old answer.
// A fresh abort signal on every request opts out of that reuse.
const freshFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store", signal: init?.signal ?? new AbortController().signal });

// Full-access client. Server-only: uses the secret key.
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!admin) {
    admin = createClient(url, key, { auth: { persistSession: false }, global: { fetch: freshFetch } });
  }
  return admin;
}

// Sign-in client. Only used for login sessions, never for reading data.
export async function getSupabaseAuth() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component. The middleware refreshes cookies instead.
        }
      },
    },
  });
}

// Sends email sign-in links that work in any browser. The SSR client always
// uses PKCE, which only works if the link opens in the same browser that asked
// for it. This plain client uses the implicit flow instead: the link lands on
// /auth/finish with the session in the URL fragment.
export function getSupabaseMailer(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type Profile = {
  id: string;
  email: string | null;
  first_name: string;
  birthdate: string;
  zip: string;
  region: string | null;
  interests: string;
  looking_for: "friends" | "friends_dating";
  hot_take: string;
  photo_path: string;
  verified_at: string | null;
  id_verified_at: string | null;
  id_attempts: number;
  verification_attempts: number;
  status: "active" | "waitlist" | "paused" | "banned";
  circle_id: string | null;
  city?: string | null;
  state?: string | null;
  tz?: string | null;
  lat?: number | null;
  lng?: number | null;
  moved_from?: string | null;
};

export async function getMe(): Promise<{
  userId: string;
  email: string | null;
  username: string | null;
  terms: string | null;
  profile: Profile | null;
} | null> {
  const auth = await getSupabaseAuth();
  const db = getSupabaseAdmin();
  if (!auth || !db) return null;
  const { data } = await auth.auth.getUser();
  if (!data.user) return null;
  const [{ data: profile }, { data: login }] = await Promise.all([
    db.from("profiles").select("*").eq("id", data.user.id).maybeSingle(),
    db.from("logins").select("username, terms_version").eq("user_id", data.user.id).maybeSingle(),
  ]);
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    username: (login?.username as string | undefined) ?? null,
    terms: (login?.terms_version as string | undefined) ?? null,
    profile: profile as Profile | null,
  };
}

// Where a signed-in member belongs right now.
export function nextPath(profile: Profile | null, username: string | null, terms: string | null): string {
  if (!username) return "/account";
  if (terms !== TERMS_VERSION) return "/agree";
  if (!profile) return "/profile";
  if (profile.status === "paused" || profile.status === "banned") return "/circle";
  if (!profile.verified_at) return "/verify";
  return "/circle";
}

export function siteOrigin(h: Headers): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
