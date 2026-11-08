-- Homosocial: ID check later. Run once. Safe to run again.
-- A guy is seated after his Realness Check and has 3 days to do his ID check,
-- so he counts toward starting a Circle in that window.

create or replace function public.place_member_geo(
  p_user uuid, p_season text, p_capacity int default 30, p_min int default 2, p_local double precision default 150
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me record;
  c uuid;
  moved uuid[] := '{}';
  target uuid;
  lone record;
  n int;
  mates uuid[];
begin
  -- One placement at a time, everywhere. Signups are rare enough that this never waits long.
  perform pg_advisory_xact_lock(hashtext('placement:' || p_season));

  select id, circle_id, lat, lng, city, tz into me from profiles where id = p_user;
  if me.circle_id is not null then
    return jsonb_build_object('circle', me.circle_id, 'moved', '[]'::jsonb);
  end if;

  -- Guys he already played a whole Season with. New Seasons try for new faces.
  select coalesce(array_agg(distinct h2.user_id), '{}') into mates
  from circle_history h1
  join circles done on done.id = h1.circle_id and done.finale_at is not null and done.finale_at <= now()
  join circle_history h2 on h2.circle_id = h1.circle_id and h2.user_id <> h1.user_id
  where h1.user_id = p_user;

  -- 1. A Circle with a seat open whose guys live close: someone in it lives near him,
  --    and that guy isn't just a stray who'll be moved home this week.
  if me.lat is not null then
    select cc.id into c
    from circle_centers cc
    join profiles m on m.circle_id = cc.id
    where cc.season = p_season and cc.members < cc.capacity
      and m.lat is not null and m.status not in ('paused', 'banned')
      and miles(me.lat, me.lng, m.lat, m.lng) <= p_local
      and (
        cc.members = 1
        or (cc.kickoff_at is not null and now() >= coalesce(cc.rehome_until, cc.kickoff_at + interval '4 days'))
        or exists (
          select 1 from profiles q
          where q.circle_id = cc.id and q.id <> m.id and q.lat is not null
            and q.status not in ('paused', 'banned')
            and miles(m.lat, m.lng, q.lat, q.lng) <= p_local
        )
      )
    order by exists (select 1 from profiles x where x.circle_id = cc.id and x.id = any(mates)),
             miles(me.lat, me.lng, m.lat, m.lng)
    limit 1;
  end if;

  -- 2. Nothing close, but guys near him are on their own in far-away Circles still in
  --    week 1 (nobody else in their Circle lives close): start a new Circle here with them.
  if c is null and me.lat is not null then
    with far as (
      select p.id, p.circle_id, miles(me.lat, me.lng, p.lat, p.lng) as d
      from profiles p
      join circle_centers cc on cc.id = p.circle_id
      where p.lat is not null and p.id <> p_user and p.status = 'active'
        and cc.season = p_season and cc.members > 1
        and (cc.kickoff_at is null or now() < coalesce(cc.rehome_until, cc.kickoff_at + interval '4 days'))
        and miles(p.lat, p.lng, me.lat, me.lng) <= p_local
        and not exists (
          select 1 from profiles q
          where q.circle_id = p.circle_id and q.id <> p.id and q.lat is not null
            and q.status not in ('paused', 'banned')
            and miles(p.lat, p.lng, q.lat, q.lng) <= p_local
        )
      order by d
      limit p_capacity - 1
    )
    select array_agg(id) into moved from far;
    moved := coalesce(moved, '{}');

    if array_length(moved, 1) >= 1 then
      select coalesce(max(number), 0) + 1 into n from circles where season = p_season;
      insert into circles (season, region, number, capacity, tz, label)
        values (p_season, 'us', n, p_capacity, coalesce(me.tz, 'America/New_York'), me.city)
        returning id into c;
      update profiles set moved_from = circle_id, circle_id = c where id = any(moved);
      -- Anyone left alone in a Circle the others were moved out of joins the nearest Circle with room.
      for lone in
        select p.id as uid, p.circle_id as old, p.lat as plat, p.lng as plng
        from profiles p
        where p.circle_id in (select distinct moved_from from profiles where id = any(moved))
          and p.status = 'active'
          and (select count(*) from profiles x where x.circle_id = p.circle_id and x.status not in ('paused', 'banned')) = 1
      loop
        select cc.id into target from circle_centers cc
        where cc.season = p_season and cc.id <> lone.old and cc.members > 0 and cc.members < cc.capacity
        order by coalesce(nearest_in(cc.id, lone.plat, lone.plng), 1e9)
        limit 1;
        if target is not null then
          update profiles set moved_from = lone.old, circle_id = target where id = lone.uid;
          moved := moved || lone.uid;
        end if;
      end loop;
    end if;
  end if;

  -- 3. Otherwise the nearest Circle with a seat, any distance (new faces first).
  if c is null then
    select cc.id into c from circle_centers cc
    where cc.season = p_season and cc.members < cc.capacity and cc.members > 0
    order by exists (select 1 from profiles x where x.circle_id = cc.id and x.id = any(mates)),
             coalesce(nearest_in(cc.id, me.lat, me.lng), 1e9), cc.members desc
    limit 1;
  end if;

  -- 4. Nobody anywhere with room: he starts one, and the next guy joins him.
  if c is null then
    select coalesce(max(number), 0) + 1 into n from circles where season = p_season;
    insert into circles (season, region, number, capacity, tz, label)
      values (p_season, 'us', n, p_capacity, coalesce(me.tz, 'America/New_York'), me.city)
      returning id into c;
  end if;

  update profiles set circle_id = c where id = p_user;

  -- Two guys with a seat (ID checked, or Realness checked in the last 3 days) is enough to start.
  -- Otherwise it starts the moment the second one gets a seat.
  update circles set kickoff_at = now()
  where id = c and kickoff_at is null
    and (select count(*) from profiles p where p.circle_id = c and p.status = 'active' and (p.id_verified_at is not null or p.verified_at > now() - interval '3 days')) >= p_min;

  return jsonb_build_object('circle', c, 'moved', to_jsonb(moved));
end;
$$;

revoke all on function public.place_member_geo(uuid, text, int, int, double precision) from public, anon, authenticated;
grant execute on function public.place_member_geo(uuid, text, int, int, double precision) to service_role;

select 'id later ready' as status;
