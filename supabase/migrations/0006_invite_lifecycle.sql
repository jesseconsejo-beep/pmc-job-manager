-- 0006_invite_lifecycle.sql
-- Fixes found while building the Crew page:
--   1. Supabase's admin invite creates the auth user immediately, so the invite
--      was stamped "accepted" before the person ever clicked the link. Now the
--      profile is activated at invite time (so the link works when they arrive)
--      but the invite stays PENDING until their first sign-in.
--   2. Deleting an account failed because "who" columns referenced profiles
--      with no ON DELETE rule. Soft references now clear on delete; history
--      (timesheets, activity log) still blocks deletion on purpose.

-- ------------------------------------------------------------
-- 1. Invite lifecycle
-- ------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv invites%rowtype;
  display_name text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
begin
  select * into inv from invites
    where lower(email) = lower(new.email)
      and accepted_at is null
      and expires_at > now()
    order by created_at desc
    limit 1;

  if inv.id is not null then
    insert into profiles (id, email, name, role, active)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', inv.name, display_name), inv.role, true);
    -- link, but do not accept yet: accepted_at is stamped on first sign-in
    update invites set accepted_user = new.id where id = inv.id;
  else
    insert into profiles (id, email, name, role, active)
    values (new.id, new.email, display_name, 'viewer', false);
  end if;
  return new;
end;
$$;

create or replace function handle_user_signed_in() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at and new.last_sign_in_at is not null then
    update invites set accepted_at = now()
      where accepted_user = new.id and accepted_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_signed_in on auth.users;
create trigger on_auth_user_signed_in
  after update of last_sign_in_at on auth.users
  for each row execute function handle_user_signed_in();

-- An invite that was sent (auth user exists) but never used can be cancelled
-- from the Crew page by deleting the account; the row then clears.
alter table invites drop constraint if exists invites_invited_by_fkey;
alter table invites add constraint invites_invited_by_fkey
  foreign key (invited_by) references profiles(id) on delete set null;
alter table invites drop constraint if exists invites_accepted_user_fkey;
alter table invites add constraint invites_accepted_user_fkey
  foreign key (accepted_user) references profiles(id) on delete cascade;

-- ------------------------------------------------------------
-- 2. Soft references clear when a profile is deleted.
--    Kept RESTRICT on purpose: timesheets.employee_id, timesheets.approved_by,
--    activity_log.user_id. Those are history; deactivate such people instead.
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.confrelid = 'public.profiles'::regclass
      and c.conrelid::regclass::text in (
        'jobs','job_assignments','tasks','rfis','change_orders','material_orders',
        'tools','photos','job_files','service_calls','schedule_events',
        'bulletin_posts','library_docs','org_settings')
      and c.confdeltype = 'a'   -- NO ACTION today
  loop
    if r.tbl::text = 'job_assignments' then
      -- part of the primary key: the assignment itself goes away
      execute format('alter table %s drop constraint %I, add constraint %I foreign key (%I) references profiles(id) on delete cascade',
        r.tbl, r.conname, r.conname, r.col);
    else
      execute format('alter table %s drop constraint %I, add constraint %I foreign key (%I) references profiles(id) on delete set null',
        r.tbl, r.conname, r.conname, r.col);
    end if;
  end loop;
end $$;
