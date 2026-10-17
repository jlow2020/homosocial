const RESERVED = new Set([
  "admin", "administrator", "homosocial", "support", "help", "host", "producer",
  "mod", "moderator", "staff", "official", "root", "system", "null", "undefined",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

// Returns an error message, or null if the username is fine.
export function usernameProblem(u: string): string | null {
  if (u.length < 3) return "Usernames need at least 3 characters.";
  if (u.length > 20) return "Usernames max out at 20 characters.";
  if (!/^[a-z0-9._]+$/.test(u)) return "Letters, numbers, periods and underscores only.";
  if (/^[._]|[._]$/.test(u)) return "Can't start or end with a period or underscore.";
  if (/\.\./.test(u)) return "No double periods.";
  if (RESERVED.has(u)) return "That one's taken.";
  return null;
}

export function passwordProblem(p: string, confirm: string): string | null {
  if (p.length < 8) return "Passwords need at least 8 characters.";
  if (p.length > 72) return "Passwords max out at 72 characters.";
  if (p !== confirm) return "Those passwords don't match.";
  return null;
}
