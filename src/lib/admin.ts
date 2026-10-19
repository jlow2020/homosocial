import "server-only";
import { notFound } from "next/navigation";
import { getMe, getSupabaseAdmin } from "./supabase-server";

export type AdminRole = "god" | "mod";

// What every member sees on an admin's card. "god" is internal only.
export const ROLE_TITLE: Record<AdminRole, string> = { god: "Daddy", mod: "Mod" };

export async function isAdmin(userId: string): Promise<AdminRole | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db.from("admins").select("role").eq("user_id", userId).maybeSingle();
  return (data?.role as AdminRole | undefined) ?? null;
}

// The signed-in admin, or null for everyone else.
export async function getAdmin() {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me || !db) return null;
  const role = await isAdmin(me.userId);
  if (!role) return null;
  return { me, db, role };
}

// Admin pages answer "not found" to everyone else, so they don't exist.
export async function requireAdmin() {
  const a = await getAdmin();
  if (!a) notFound();
  return a;
}

export async function logAdmin(
  adminId: string,
  action: string,
  target: string | null,
  detail: Record<string, unknown> = {}
) {
  const db = getSupabaseAdmin();
  if (!db) return;
  await db.from("admin_log").insert({ admin_id: adminId, action, target, detail });
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
