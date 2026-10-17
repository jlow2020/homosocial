-- Homosocial: one-time ID check. Run once in Supabase > SQL Editor.
alter table public.profiles
  add column if not exists id_verified_at timestamptz,
  add column if not exists id_attempts integer not null default 0;

create table if not exists public.id_checks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  doc_hash text not null unique, -- one-way fingerprint, never the ID number
  doc_kind text not null,
  issuer text,
  face_match real not null,
  checked_at timestamptz not null default now()
);

alter table public.id_checks enable row level security;
