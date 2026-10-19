-- Homosocial: the drop engine. Member-written drops, Daddy's Picks, heat votes,
-- Guess Who. Run once in Supabase > SQL Editor. Safe to run more than once.

-- Every drop keeps a snapshot of what was asked, so generated drops render
-- forever even if the templates change.
alter table public.drops
  add column if not exists body text,
  add column if not exists hint text,
  add column if not exists mode text not null default 'text'
    check (mode in ('text', 'photo', 'anon', 'guesswho', 'dare')),
  add column if not exists heat int not null default 2,
  add column if not exists source text not null default 'house',
  add column if not exists credit text;

-- Member-written drops and Daddy's Picks. House prompts live in code.
create table if not exists public.prompt_bank (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  hint text,
  week int not null check (week between 1 and 8),
  heat int not null default 3 check (heat between 1 and 5),
  mode text not null default 'text' check (mode in ('text', 'photo', 'anon', 'guesswho', 'dare')),
  author_id uuid references public.profiles (id) on delete set null,
  credit text,
  source text not null check (source in ('member', 'daddy')),
  status text not null default 'queued' check (status in ('queued', 'approved', 'retired')),
  pinned boolean not null default false, -- Daddy's Pick: every Circle hitting this week gets it next
  times_used int not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists prompt_bank_status_idx on public.prompt_bank (status, week);

-- The Circle votes the heat up.
alter table public.circles add column if not exists heat_boost int not null default 0;
create table if not exists public.heat_votes (
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (circle_id, season_no, user_id)
);

-- Guess Who: who wrote the anonymous answer?
create table if not exists public.guesses (
  drop_id uuid not null references public.drops (id) on delete cascade,
  guesser uuid not null references public.profiles (id) on delete cascade,
  answer_id uuid not null references public.answers (id) on delete cascade,
  guessed uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (drop_id, guesser, answer_id)
);

alter table public.prompt_bank enable row level security;
alter table public.heat_votes enable row level security;
alter table public.guesses enable row level security;
