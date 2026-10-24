-- Homosocial: short videos on profiles, next to the extra photos. Run after nationwide.sql.
alter table public.profile_photos add column if not exists kind text not null default 'photo';
alter table public.profile_photos drop constraint if exists profile_photos_kind_check;
alter table public.profile_photos add constraint profile_photos_kind_check check (kind in ('photo', 'video'));
-- Videos live in the clips bucket and play once they're converted.
alter table public.profile_photos add column if not exists ready boolean not null default true;
-- Held by the nudity check: only he sees it, until a person looks.
alter table public.profile_photos add column if not exists held boolean not null default false;
