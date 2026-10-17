-- Homosocial: usernames for password sign-in.
-- Run once in Supabase > SQL Editor.
create table if not exists public.logins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username = lower(username)),
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists logins_username_key on public.logins (username);
create index if not exists logins_email_idx on public.logins (lower(email));

alter table public.logins enable row level security;
