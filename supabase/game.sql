-- Homosocial: the game. Drops, answers, the Lounge, Plans, DMs, Roses,
-- Finale picks, Stay or Mix, the Circle clock, and test Circles.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.

-- Circle clock --------------------------------------------------------------
alter table public.circles
  add column if not exists kickoff_at timestamptz,
  add column if not exists season_no int not null default 1,
  add column if not exists week_override int check (week_override between 1 and 9),
  add column if not exists is_test boolean not null default false,
  add column if not exists demo_seeded jsonb not null default '{}'::jsonb;

-- Fake guys for test Circles, and where Daddy goes back to after playing.
alter table public.profiles
  add column if not exists is_demo boolean not null default false,
  add column if not exists home_circle_id uuid references public.circles (id) on delete set null;

-- Weekly drops ----------------------------------------------------------------
create table if not exists public.drops (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  week int not null check (week between 1 and 8),
  prompt_id text not null,
  created_at timestamptz not null default now(),
  unique (circle_id, season_no, week)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  photo_path text,
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (drop_id, user_id)
);

create table if not exists public.reactions (
  answer_id uuid not null references public.answers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('fire', 'lol', 'crown', 'heart')),
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id, emoji)
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists replies_answer_idx on public.replies (answer_id, created_at);

-- The Lounge ------------------------------------------------------------------
create table if not exists public.lounge_messages (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists lounge_circle_idx on public.lounge_messages (circle_id, created_at desc);

-- Plans -----------------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  place text,
  starts_at timestamptz,
  details text,
  created_at timestamptz not null default now()
);
create table if not exists public.plan_rsvps (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

-- DMs -------------------------------------------------------------------------
create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.profiles (id) on delete cascade,
  b uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  check (a < b),
  unique (a, b)
);
create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists dm_messages_thread_idx on public.dm_messages (thread_id, created_at);

-- Week 7 Roses ----------------------------------------------------------------
create table if not exists public.roses (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  unique (circle_id, season_no, from_id, to_id),
  check (from_id <> to_id)
);

-- Week 8 picks, setups, Stay or Mix ------------------------------------------
create table if not exists public.picks (
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('friend', 'date')),
  created_at timestamptz not null default now(),
  primary key (circle_id, season_no, from_id, to_id, kind),
  check (from_id <> to_id)
);
create table if not exists public.setups (
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  from_id uuid not null references public.profiles (id) on delete cascade,
  a uuid not null references public.profiles (id) on delete cascade,
  b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (circle_id, season_no, from_id, a, b),
  check (a < b)
);
create table if not exists public.stay_choices (
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  choice text not null check (choice in ('stay', 'mix')),
  created_at timestamptz not null default now(),
  primary key (circle_id, season_no, user_id)
);

-- Only the website's server (secret key) reads or writes any of this.
alter table public.drops enable row level security;
alter table public.answers enable row level security;
alter table public.reactions enable row level security;
alter table public.replies enable row level security;
alter table public.lounge_messages enable row level security;
alter table public.plans enable row level security;
alter table public.plan_rsvps enable row level security;
alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;
alter table public.roses enable row level security;
alter table public.picks enable row level security;
alter table public.setups enable row level security;
alter table public.stay_choices enable row level security;

-- Jonathan's birthdate.
update public.profiles set birthdate = '1980-09-29' where id = 'aac09c2d-6682-4021-b242-c51f802e4401';

-- DM photos: each guy turns photos on for a chat. Both on = photos unlocked.
alter table public.dm_threads
  add column if not exists photos_a boolean not null default false,
  add column if not exists photos_b boolean not null default false;
alter table public.dm_messages
  add column if not exists photo_path text,
  alter column body drop not null;

-- DMs, Messenger style: video clips, reactions, read receipts.
alter table public.dm_messages
  add column if not exists media_type text check (media_type in ('photo', 'video'));
update public.dm_messages set media_type = 'photo' where photo_path is not null and media_type is null;
alter table public.dm_threads
  add column if not exists read_a timestamptz,
  add column if not exists read_b timestamptz;
create table if not exists public.dm_reactions (
  message_id uuid not null references public.dm_messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.dm_reactions enable row level security;
-- Private bucket for DM video clips, 50 MB max each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
