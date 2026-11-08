-- Homosocial: the Circle Wall. Run once. Safe to run again.
-- Posts only the guys in your Circle see, with likes and comments. Posts and
-- comments can carry a photo or a short video. Everything goes through the same
-- auto-moderation as the rest of the game.

create table if not exists public.wall_posts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  photo_path text,
  media_type text check (media_type in ('photo', 'video')),
  ready boolean not null default true,
  held boolean not null default false,
  veiled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists wall_posts_circle on public.wall_posts (circle_id, created_at desc);

create table if not exists public.wall_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.wall_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  photo_path text,
  media_type text check (media_type in ('photo', 'video')),
  ready boolean not null default true,
  held boolean not null default false,
  veiled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists wall_comments_post on public.wall_comments (post_id, created_at);

create table if not exists public.wall_likes (
  post_id uuid not null references public.wall_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.wall_comment_likes (
  comment_id uuid not null references public.wall_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.wall_posts enable row level security;
alter table public.wall_comments enable row level security;
alter table public.wall_likes enable row level security;
alter table public.wall_comment_likes enable row level security;
revoke all on public.wall_posts, public.wall_comments, public.wall_likes, public.wall_comment_likes from anon, authenticated;

select 'wall ready' as status;
