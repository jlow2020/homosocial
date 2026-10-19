-- Homosocial: rich profiles. Run after mod.sql.

alter table public.profiles add column if not exists pronouns text;
alter table public.profiles add column if not exists hometown text;
alter table public.profiles add column if not exists work text;
alter table public.profiles add column if not exists zodiac text;
alter table public.profiles add column if not exists song text;
alter table public.profiles add column if not exists spot text;
alter table public.profiles add column if not exists relationship text;
alter table public.profiles add column if not exists show_relationship boolean not null default false;
alter table public.profiles add column if not exists voice_path text;
alter table public.profiles add column if not exists voice_ready boolean not null default true;
alter table public.profiles add column if not exists pinned_answer_id uuid references public.answers (id) on delete set null;

-- Extra photos, each with an optional theme. The main face photo stays on the profile.
create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null,
  theme text,
  position int not null default 0,
  veiled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists profile_photos_user on public.profile_photos (user_id, position);

-- Three prompt answers.
create table if not exists public.profile_answers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt_id text not null,
  body text not null,
  position int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, prompt_id)
);

-- Tags: what he's into, and what he's down to do.
create table if not exists public.user_tags (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null,
  kind text not null check (kind in ('interest', 'down')),
  created_at timestamptz not null default now(),
  primary key (user_id, slug, kind)
);
create index if not exists user_tags_slug on public.user_tags (slug);

-- Tags members made up. Shown to others once a few guys use them.
create table if not exists public.custom_tags (
  slug text primary key,
  label text not null,
  uses int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  status text not null default 'ok' check (status in ('ok', 'hidden')),
  created_at timestamptz not null default now()
);

alter table public.profile_photos enable row level security;
alter table public.profile_answers enable row level security;
alter table public.user_tags enable row level security;
alter table public.custom_tags enable row level security;
