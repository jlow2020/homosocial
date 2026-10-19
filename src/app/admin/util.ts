import type { Profile } from "@/lib/supabase-server";

export type Stage =
  | "No username"
  | "No profile"
  | "Realness pending"
  | "Lobby"
  | "Seated"
  | "Waitlist"
  | "Paused"
  | "Banned";

export const STAGES: Stage[] = [
  "No username",
  "No profile",
  "Realness pending",
  "Lobby",
  "Seated",
  "Waitlist",
  "Paused",
  "Banned",
];

export function stageOf(profile: Profile | null, hasUsername: boolean): Stage {
  if (!hasUsername && !profile) return "No username";
  if (!profile) return "No profile";
  if (profile.status === "banned") return "Banned";
  if (profile.status === "paused") return "Paused";
  if (profile.status === "waitlist") return "Waitlist";
  if (profile.id_verified_at) return "Seated";
  if (profile.verified_at) return "Lobby";
  return "Realness pending";
}

export function stageTone(s: Stage): string {
  switch (s) {
    case "Seated":
      return "pill-mint";
    case "Lobby":
      return "pill-gold";
    case "Paused":
    case "Banned":
      return "pill-hot";
    default:
      return "pill-plain";
  }
}

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function when(iso: string | null | undefined): string {
  if (!iso) return "never";
  return fmt.format(new Date(iso));
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "n/a";
  return n.toFixed(3);
}
