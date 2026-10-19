-- Homosocial: auto-moderation. Run after legal.sql.

-- Everything the filter held, flagged or veiled, waiting on a person.
create table if not exists public.mod_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  circle_id uuid references public.circles (id) on delete set null,
  surface text not null,
  ref_table text,
  ref_id uuid,
  content text,
  media_bucket text,
  media_path text,
  verdict text not null check (verdict in ('held', 'flagged', 'veiled')),
  category text,
  reason text,
  urgent boolean not null default false,
  detail jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'removed', 'dismissed')),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  strike boolean not null default false
);
create index if not exists mod_queue_pending on public.mod_queue (status, urgent desc, created_at desc);
alter table public.mod_queue enable row level security;

-- Strikes only ever come from a person confirming a removal.
create table if not exists public.strikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  queue_id uuid references public.mod_queue (id) on delete set null,
  category text,
  created_at timestamptz not null default now(),
  given_by uuid references public.profiles (id) on delete set null
);
create index if not exists strikes_user on public.strikes (user_id, created_at desc);
alter table public.strikes enable row level security;

-- Held: waiting on a person, only the author sees it. Veiled: posted, blurred until tapped.
alter table public.answers add column if not exists held boolean not null default false;
alter table public.answers add column if not exists veiled boolean not null default false;
alter table public.replies add column if not exists held boolean not null default false;
alter table public.lounge_messages add column if not exists held boolean not null default false;
alter table public.plans add column if not exists held boolean not null default false;
alter table public.roses add column if not exists held boolean not null default false;
alter table public.dm_messages add column if not exists held boolean not null default false;

-- A timed pause from strikes ends on its own.
alter table public.profiles add column if not exists paused_until timestamptz;
alter table public.profiles add column if not exists pause_reason text;

-- Once-a-day things for staff (the review digest).
create table if not exists public.admin_notices (
  key text primary key,
  sent_at timestamptz not null default now()
);
alter table public.admin_notices enable row level security;

-- Rank Night is a new kind of drop.
alter table public.drops drop constraint if exists drops_mode_check;
alter table public.drops add constraint drops_mode_check check (mode in (
  'text', 'photo', 'anon', 'guesswho', 'dare',
  'survey', 'thisorthat', 'madlibs', 'speed', 'twotruths', 'video',
  'caption', 'rank', 'owner', 'chain', 'hotseat', 'voice', 'blinddate', 'ranknight'
));
alter table public.prompt_bank drop constraint if exists prompt_bank_mode_check;
alter table public.prompt_bank add constraint prompt_bank_mode_check check (mode in (
  'text', 'photo', 'anon', 'guesswho', 'dare',
  'survey', 'thisorthat', 'madlibs', 'speed', 'twotruths', 'video',
  'caption', 'rank', 'owner', 'chain', 'hotseat', 'voice', 'blinddate', 'ranknight'
));

-- Speed Round rematches in DMs.
create table if not exists public.dm_games (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  kind text not null default 'speed' check (kind in ('speed')),
  questions jsonb not null,
  seconds int not null default 60,
  started_by uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.dm_games enable row level security;
alter table public.dm_messages add column if not exists game_id uuid references public.dm_games (id) on delete cascade;

-- The Chain, read aloud: once a story ends, anyone can record himself reading it.
create table if not exists public.chain_readings (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null,
  ready boolean not null default false,
  created_at timestamptz not null default now(),
  unique (drop_id, user_id)
);
create table if not exists public.reading_fires (
  reading_id uuid not null references public.chain_readings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (reading_id, user_id)
);
alter table public.chain_readings enable row level security;
alter table public.reading_fires enable row level security;
