-- Homosocial: clean slate for launch. Deletes every Circle (test and old
-- Florida ones), every fake guy, and the test-era admin log. Real accounts and
-- profiles stay; each real guy is seated fresh, by distance, the next time he
-- opens Homosocial. This deletes data and can't be undone.

begin;

-- 1. Free every real guy from his Circle.
update public.profiles
set circle_id = null, home_circle_id = null, moved_from = null
where not is_demo;

-- 2. The fake guys: deleting their logins deletes their profiles and everything they posted.
delete from auth.users where id in (select id from public.profiles where is_demo);

-- 3. Every Circle, with every drop, answer, chat, plan, vote and badge in it.
delete from public.circles;

-- 4. Admin log entries from testing.
delete from public.admin_log where action ilike '%test%' or action ilike '%week%' or action ilike '%season%';

commit;

-- What's left.
select
  (select count(*) from public.circles) as circles,
  (select count(*) from public.profiles) as guys,
  (select count(*) from public.profiles where is_demo) as fake_guys_left;
