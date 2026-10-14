-- Homosocial: members, Circles, Realness Check, block and report.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once.

-- Circles ----------------------------------------------------------------
create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  season text not null,
  region text not null,
  number int not null,
  capacity int not null default 40,
  unique (season, region, number)
);

-- Members ----------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  first_name text not null,
  birthdate date not null,
  zip text not null check (zip ~ '^\d{5}$'),
  region text,
  interests text not null,
  looking_for text not null check (looking_for in ('friends', 'friends_dating')),
  hot_take text not null,
  photo_path text not null,
  verified_at timestamptz,
  verification jsonb,
  verification_attempts int not null default 0,
  status text not null default 'active'
    check (status in ('active', 'waitlist', 'paused', 'banned')),
  paused_at timestamptz,
  circle_id uuid references public.circles (id),
  notes text
);

create index if not exists profiles_circle_idx on public.profiles (circle_id);

-- Blocks and reports -----------------------------------------------------
create table if not exists public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reporter uuid not null references public.profiles (id) on delete cascade,
  reported uuid not null references public.profiles (id) on delete cascade,
  reason text not null
    check (reason in ('fake', 'harassment', 'underage', 'scam', 'other')),
  details text,
  unique (reporter, reported),
  check (reporter <> reported)
);

-- Everything goes through the website's server, which uses the secret key.
-- No browser can read or write these tables directly.
alter table public.circles enable row level security;
alter table public.profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Auto-pause: 3 different verified, active members report the same guy.
create or replace function public.check_reports() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  select count(distinct r.reporter) into n
  from reports r
  join profiles p on p.id = r.reporter
  where r.reported = new.reported
    and p.verified_at is not null
    and p.status = 'active';

  if n >= 3 then
    update profiles
      set status = 'paused', paused_at = now()
      where id = new.reported and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_auto_pause on public.reports;
create trigger reports_auto_pause
  after insert on public.reports
  for each row execute function public.check_reports();

-- Placement: put a verified member in the first Circle in his region with
-- room, or open the next Circle. Locked so two guys can't take the last seat.
create or replace function public.place_member(
  p_user uuid, p_season text, p_region text, p_capacity int default 40
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c uuid;
  n int;
begin
  perform pg_advisory_xact_lock(hashtext(p_season || ':' || p_region));

  select circle_id into c from profiles where id = p_user;
  if c is not null then
    return c;
  end if;

  select ci.id into c
  from circles ci
  where ci.season = p_season and ci.region = p_region
    and (select count(*) from profiles p where p.circle_id = ci.id) < ci.capacity
  order by ci.number
  limit 1;

  if c is null then
    select coalesce(max(number), 0) + 1 into n
      from circles where season = p_season and region = p_region;
    insert into circles (season, region, number, capacity)
      values (p_season, p_region, n, p_capacity)
      returning id into c;
  end if;

  update profiles set circle_id = c where id = p_user;
  return c;
end;
$$;

revoke all on function public.place_member(uuid, text, text, int) from public, anon, authenticated;
revoke all on function public.check_reports() from public, anon, authenticated;
grant execute on function public.place_member(uuid, text, text, int) to service_role;

-- Private photo storage --------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('verifications', 'verifications', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;
