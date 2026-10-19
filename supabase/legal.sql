-- Homosocial: consent records, banned-ID fingerprints. Run after notify.sql.

-- Which version of the Terms he last agreed to (fast check on every page).
alter table public.logins add column if not exists terms_version text;
alter table public.logins add column if not exists terms_at timestamptz;

-- The full, dated record: what he agreed to, which version, from what device.
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('terms', 'biometric')),
  version text not null,
  accepted_at timestamptz not null default now(),
  user_agent text,
  ip text,
  unique (user_id, kind, version)
);
alter table public.consents enable row level security;

-- When a banned guy deletes his account, his ID's one-way fingerprint stays
-- here so the same ID can't open a new one. Nothing else about him is kept.
create table if not exists public.banned_ids (
  doc_hash text primary key,
  banned_at timestamptz not null default now()
);
alter table public.banned_ids enable row level security;
