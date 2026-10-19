-- Notifications, the Sunday Read, badges, answer reports, media readiness.
-- Run after plays2.sql.

-- Web push subscriptions, one row per browser.
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_user on public.push_subs (user_id);

-- Things a Circle has already been told (drop:1:3, nudge:1:3, read:1:3, finale:1).
create table if not exists public.notices (
  circle_id uuid not null references public.circles (id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (circle_id, key)
);

alter table public.profiles add column if not exists notify_email boolean not null default true;

-- Locked results for a week (Rank winner, best guesser, best liar, caption winner) and the moment they locked.
alter table public.drops add column if not exists locked_at timestamptz;
alter table public.drops add column if not exists result jsonb;

-- Badges stick across Seasons.
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  week int not null,
  badge text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, circle_id, season_no, week, badge)
);
create index if not exists badges_user on public.badges (user_id);

-- Reports can point at an answer, not just a guy.
alter table public.reports drop constraint if exists reports_reporter_reported_key;
alter table public.reports add column if not exists answer_id uuid references public.answers (id) on delete set null;
create unique index if not exists reports_once_per_guy on public.reports (reporter, reported) where answer_id is null;
create unique index if not exists reports_once_per_answer on public.reports (reporter, answer_id) where answer_id is not null;

-- Answers a mod has pulled.
alter table public.answers add column if not exists hidden boolean not null default false;
-- Media that still needs converting (iPhone .mov and .m4a get turned into .mp4 and .m4a everyone can play).
alter table public.answers add column if not exists ready boolean not null default true;
alter table public.dm_messages add column if not exists ready boolean not null default true;

-- Blind Date: both have to tap Keep talking after the reveal.
alter table public.dm_threads add column if not exists keep_a boolean not null default false;
alter table public.dm_threads add column if not exists keep_b boolean not null default false;

-- Mad Libs: votes for the best story. One vote per guy per drop.
create table if not exists public.story_votes (
  drop_id uuid not null references public.drops (id) on delete cascade,
  voter uuid not null references public.profiles (id) on delete cascade,
  answer_id uuid not null references public.answers (id) on delete cascade,
  primary key (drop_id, voter)
);

alter table public.push_subs enable row level security;
alter table public.notices enable row level security;
alter table public.badges enable row level security;
alter table public.story_votes enable row level security;

-- Last time the clock ran for this Circle (pages run it if it's been a while).
alter table public.circles add column if not exists ticked_at timestamptz;
