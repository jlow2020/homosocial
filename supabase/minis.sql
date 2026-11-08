-- Homosocial: minis. Run once. Safe to run again.
-- Two one-tap questions a week that unlock after a guy plays the main drop.

-- The two minis each Circle gets each week.
create table if not exists public.minis (
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  week int not null,
  slot int not null check (slot in (1, 2)),
  mini_id text not null,
  created_at timestamptz not null default now(),
  primary key (circle_id, season_no, week, slot)
);

-- Who answered what. choice is the option for pick and poll; pick_user is the guy for "who".
create table if not exists public.mini_answers (
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  week int not null,
  slot int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  mini_id text not null,
  choice int,
  pick_user uuid references public.profiles (id) on delete set null,
  answered_at timestamptz not null default now(),
  primary key (circle_id, season_no, week, slot, user_id)
);
create index if not exists mini_answers_user on public.mini_answers (user_id);

-- One "new mini" push per guy per mini.
create table if not exists public.mini_pings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  season_no int not null,
  week int not null,
  slot int not null,
  at timestamptz not null default now(),
  primary key (user_id, circle_id, season_no, week, slot)
);

alter table public.minis enable row level security;
alter table public.mini_answers enable row level security;
alter table public.mini_pings enable row level security;
revoke all on public.minis, public.mini_answers, public.mini_pings from anon, authenticated;

select 'minis ready' as status;
