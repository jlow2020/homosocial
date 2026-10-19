-- Homosocial: Founders. The first 300 guys in Florida to pass the ID check
-- get a numbered Founder badge for good. Run once in Supabase > SQL Editor.
alter table public.profiles add column if not exists founder_no int unique;

-- Hands out the next Founder number, if any are left. Locked so two guys
-- can't get the same number. Fake test guys and out-of-state guys don't count.
create or replace function public.claim_founder(p_user uuid, p_cap int) returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
  taken int;
begin
  perform pg_advisory_xact_lock(hashtext('founders'));
  select founder_no into n from profiles where id = p_user;
  if n is not null then return n; end if;
  if not exists (
    select 1 from profiles
    where id = p_user and not is_demo and region is not null and id_verified_at is not null
  ) then
    return null;
  end if;
  select count(*) into taken from profiles where founder_no is not null;
  if taken >= p_cap then return null; end if;
  select coalesce(max(founder_no), 0) + 1 into n from profiles;
  update profiles set founder_no = n where id = p_user;
  return n;
end;
$$;

revoke all on function public.claim_founder(uuid, int) from public, anon, authenticated;
grant execute on function public.claim_founder(uuid, int) to service_role;

-- Everyone already seated, oldest first. Jonathan is Founder #1.
select public.claim_founder('aac09c2d-6682-4021-b242-c51f802e4401', 300);
do $$
declare r record;
begin
  for r in
    select id from profiles
    where id_verified_at is not null and not is_demo and founder_no is null
    order by id_verified_at
  loop
    perform public.claim_founder(r.id, 300);
  end loop;
end $$;

select first_name, founder_no from public.profiles where founder_no is not null order by founder_no;
