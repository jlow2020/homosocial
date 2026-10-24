-- Homosocial: remove the test Circle and the fake guys, for good.
-- Run after nationwide.sql. This deletes data and can't be undone.

begin;

-- 1. Real guys sitting in a test Circle get freed up. They're seated in a real
--    Circle, by distance, the next time they open Homosocial.
update public.profiles
set circle_id = null, home_circle_id = null, moved_from = null
where not is_demo
  and (circle_id in (select id from public.circles where is_test)
       or home_circle_id in (select id from public.circles where is_test));

-- 2. The fake guys: deleting their logins deletes their profiles and everything they posted.
delete from auth.users where id in (select id from public.profiles where is_demo);

-- 3. The test Circles, with every drop, answer, chat and vote in them.
delete from public.circles where is_test;

commit;

-- What's left.
select
  (select count(*) from public.circles) as circles,
  (select count(*) from public.profiles) as guys,
  (select count(*) from public.profiles where is_demo) as fake_guys_left;
