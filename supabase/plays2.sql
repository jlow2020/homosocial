-- Homosocial: the rest of the plays. Caption This, Rank the Circle, Guess the
-- Owner, Whose Text, The Chain, Hot Seat, voice memos, Blind Date.
-- Run once in Supabase > SQL Editor. Safe to run more than once.

alter table public.drops drop constraint if exists drops_mode_check;
alter table public.drops add constraint drops_mode_check check (mode in (
  'text', 'photo', 'anon', 'guesswho', 'dare',
  'survey', 'thisorthat', 'madlibs', 'speed', 'twotruths', 'video',
  'caption', 'rank', 'owner', 'chain', 'hotseat', 'voice', 'blinddate'
));
alter table public.prompt_bank drop constraint if exists prompt_bank_mode_check;
alter table public.prompt_bank add constraint prompt_bank_mode_check check (mode in (
  'text', 'photo', 'anon', 'guesswho', 'dare',
  'survey', 'thisorthat', 'madlibs', 'speed', 'twotruths', 'video',
  'caption', 'rank', 'owner', 'chain', 'hotseat', 'voice', 'blinddate'
));

-- Voice memos are audio.
alter table public.answers drop constraint if exists answers_media_type_check;
alter table public.answers add constraint answers_media_type_check check (media_type in ('photo', 'video', 'audio'));
update storage.buckets
  set allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
  where id = 'clips';

-- Blind Date: a DM thread with names and faces hidden until the week ends.
alter table public.dm_threads
  add column if not exists blind_until timestamptz,
  add column if not exists blind_drop uuid references public.drops (id) on delete set null;
