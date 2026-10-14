-- Homosocial: Season 0 applications
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null,
  email text not null unique,
  age int not null check (age >= 18 and age <= 99),
  zip text not null check (zip ~ '^\d{5}$'),
  instagram text,
  interests text not null,
  looking_for text not null check (looking_for in ('friends', 'friends_dating')),
  hot_take text not null,
  heard_from text,
  selfie_path text not null,
  status text not null default 'new'
    check (status in ('new', 'call_scheduled', 'approved', 'declined')),
  notes text
);

-- Lock the table down. The website writes through the server with the
-- service role key, which bypasses these rules. Nobody else can read or write.
alter table public.applications enable row level security;

-- Private bucket for selfies. Not public: only you can view them in the dashboard.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('selfies', 'selfies', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
