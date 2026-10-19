-- Homosocial: admin accounts and a log of every admin action.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.

-- god: everything, including making other admins.
-- mod: everything except making or removing admins. For future hosts.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'mod' check (role in ('god', 'mod')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null
);

create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target uuid,
  detail jsonb
);

create index if not exists admin_log_target_idx on public.admin_log (target, at desc);

-- Only the website's server (secret key) can read or write these.
alter table public.admins enable row level security;
alter table public.admin_log enable row level security;

-- Jonathan (jonathankeepsgoing): god mode.
insert into public.admins (user_id, role)
values ('aac09c2d-6682-4021-b242-c51f802e4401', 'god')
on conflict (user_id) do update set role = 'god';
