-- Homosocial: mixed-media drops ("plays"). Surveys, This or That, Mad Libs,
-- Speed Rounds, Two Truths and a Lie, video answers.
-- Run once in Supabase > SQL Editor. Safe to run more than once.

alter table public.drops drop constraint if exists drops_mode_check;
alter table public.drops
  add column if not exists spec jsonb,
  add constraint drops_mode_check check (mode in (
    'text', 'photo', 'anon', 'guesswho', 'dare',
    'survey', 'thisorthat', 'madlibs', 'speed', 'twotruths', 'video'
  ));

alter table public.prompt_bank drop constraint if exists prompt_bank_mode_check;
alter table public.prompt_bank
  add constraint prompt_bank_mode_check check (mode in (
    'text', 'photo', 'anon', 'guesswho', 'dare',
    'survey', 'thisorthat', 'madlibs', 'speed', 'twotruths', 'video'
  ));

-- Structured answers (survey picks, choices, filled-in words) and video answers.
alter table public.answers
  add column if not exists data jsonb,
  add column if not exists media_type text check (media_type in ('photo', 'video'));
update public.answers set media_type = 'photo' where photo_path is not null and media_type is null;

-- Two Truths and a Lie: which statement the Circle thinks is the lie.
create table if not exists public.votes (
  drop_id uuid not null references public.drops (id) on delete cascade,
  voter uuid not null references public.profiles (id) on delete cascade,
  answer_id uuid not null references public.answers (id) on delete cascade,
  choice int not null,
  created_at timestamptz not null default now(),
  primary key (drop_id, voter, answer_id)
);
alter table public.votes enable row level security;

-- Video answers live with the DM clips.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;
