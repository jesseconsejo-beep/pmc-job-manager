-- 0002_hardening.sql
-- Closes the holes found in the 2026-10-09 review of 0001_baseline.sql:
--   1. any user could set their own profiles.role = 'owner'
--   2. any signup became an active foreman; deactivated users kept access
--   3. timesheet approval could be bypassed on INSERT; approver was not forced
--   4. storage bucket 'photos' ignored the per-job photo tiering
-- Also: job/service-call delete restricted to admins, audit-log actor forced,
-- search_path pinned on security-definer functions, updated_at maintained.
-- Safe to run on prod (empty shell) and on a fresh database after 0001.

-- ============================================================
-- A. HELPERS (all security definer, search_path pinned)
-- ============================================================

-- Is the given user an active admin (owner/pm)? 0003 redefines this over role_catalog.
create or replace function user_is_admin(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = u and active = true and role in ('owner','pm')
  );
$$;

-- May the given user approve timesheets? 0003 redefines this over role_catalog.
create or replace function user_can_approve(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select user_is_admin(u);
$$;

create or replace function is_owner_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select user_is_admin(auth.uid());
$$;

-- Any active member of the company (the new baseline for "authenticated").
create or replace function is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and active = true
  );
$$;

-- Role key of the caller, null if unknown or inactive.
create or replace function app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active = true;
$$;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on jobs;
create trigger jobs_set_updated_at before update on jobs
  for each row execute function set_updated_at();

-- ============================================================
-- B. PROFILES: nobody edits their own role/activation (hole 1)
-- ============================================================
create or replace function protect_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- service role / SQL editor (no JWT): unrestricted; this is how tenants are bootstrapped
  if auth.uid() is null then
    new.updated_at = now();
    return new;
  end if;

  if new.id is distinct from old.id or lower(new.email) is distinct from lower(old.email) then
    raise exception 'Profile id and email cannot be changed here';
  end if;

  if new.role is distinct from old.role or new.active is distinct from old.active then
    if not is_owner_or_admin() then
      raise exception 'Only owners or PMs can change roles or activation';
    end if;
    if new.id = auth.uid() then
      raise exception 'You cannot change your own role or activation';
    end if;
    if (new.role = 'owner' or old.role = 'owner') and app_role() <> 'owner' then
      raise exception 'Only an owner can grant or remove the owner role';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on profiles;
create trigger profiles_protect_privileges before update on profiles
  for each row execute function protect_profile_privileges();

-- Inactive users may still read their own row (so the app can say "pending").
drop policy if exists profiles_self_read on profiles;
create policy profiles_member_read on profiles for select
  using (is_active_member() or id = auth.uid());

-- ============================================================
-- C. INVITE-ONLY SIGNUP (hole 2)
-- ============================================================
-- Flow: an admin inserts an invite row, then the app calls Supabase's admin
-- inviteUserByEmail. When the auth user is created, handle_new_user finds the
-- invite and activates the profile with the invited role. Any signup without
-- a live invite is parked inactive and sees nothing.
-- Also turn OFF "Allow new users to sign up" in the Supabase dashboard; this
-- table is defence in depth, not a substitute.
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'foreman'
    check (role in ('owner','pm','superintendent','foreman','journeyman','apprentice','office','service_tech','viewer')),
  name text,
  invited_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_user uuid references profiles(id)
);

create unique index if not exists invites_pending_email_idx
  on invites (lower(email)) where accepted_at is null;

alter table invites enable row level security;

drop policy if exists invites_admin_all on invites;
create policy invites_admin_all on invites for all
  using (is_owner_or_admin()) with check (is_owner_or_admin());

-- Only an owner can invite another owner.
create or replace function guard_invite_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email = lower(trim(new.email));
  if auth.uid() is null then return new; end if;
  if new.role = 'owner' and app_role() <> 'owner' then
    raise exception 'Only an owner can invite an owner';
  end if;
  new.invited_by = coalesce(new.invited_by, auth.uid());
  return new;
end;
$$;

drop trigger if exists invites_guard_role on invites;
create trigger invites_guard_role before insert or update on invites
  for each row execute function guard_invite_role();

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
    update invites set accepted_at = now(), accepted_user = new.id where id = inv.id;
  else
    -- Uninvited: parked. An admin can activate from the Crew page.
    -- Tenant bootstrap (first owner) is a one-line SQL step, see README.
    insert into profiles (id, email, name, role, active)
    values (new.id, new.email, display_name, 'viewer', false);
  end if;
  return new;
end;
$$;

-- ============================================================
-- D. "AUTHENTICATED" becomes "ACTIVE MEMBER" on every permissive policy
-- ============================================================
drop policy if exists jobs_authenticated_read on jobs;
drop policy if exists jobs_authenticated_write on jobs;
create policy jobs_member_read   on jobs for select using (is_active_member());
create policy jobs_member_insert on jobs for insert with check (is_active_member());
create policy jobs_member_update on jobs for update using (is_active_member());
create policy jobs_admin_delete  on jobs for delete using (is_owner_or_admin());

drop policy if exists contacts_auth_all on contacts;
create policy contacts_member_all on contacts for all using (is_active_member());

drop policy if exists tasks_auth_all on tasks;
create policy tasks_member_all on tasks for all using (is_active_member());

drop policy if exists rfis_auth_all on rfis;
create policy rfis_member_all on rfis for all using (is_active_member());

drop policy if exists cos_auth_all on change_orders;
create policy cos_member_all on change_orders for all using (is_active_member());

drop policy if exists materials_auth_all on material_orders;
create policy materials_member_all on material_orders for all using (is_active_member());

drop policy if exists tools_auth_all on tools;
create policy tools_member_all on tools for all using (is_active_member());

drop policy if exists files_auth_all on job_files;
create policy files_member_all on job_files for all using (is_active_member());

drop policy if exists service_auth_all on service_calls;
create policy service_member_read   on service_calls for select using (is_active_member());
create policy service_member_insert on service_calls for insert with check (is_active_member());
create policy service_member_update on service_calls for update using (is_active_member());
create policy service_admin_delete  on service_calls for delete using (is_owner_or_admin());

drop policy if exists schedule_auth_all on schedule_events;
create policy schedule_member_all on schedule_events for all using (is_active_member());

drop policy if exists bulletin_auth_all on bulletin_posts;
create policy bulletin_member_all on bulletin_posts for all using (is_active_member());

drop policy if exists library_auth_all on library_docs;
create policy library_member_all on library_docs for all using (is_active_member());

drop policy if exists assignments_auth_all on job_assignments;
create policy assignments_member_read on job_assignments for select using (is_active_member());
create policy assignments_admin_write on job_assignments for all using (is_owner_or_admin());

-- Photos: same tiering as before, now also requires an active membership.
drop policy if exists photos_tiered_read on photos;
drop policy if exists photos_tiered_insert on photos;
drop policy if exists photos_owner_update on photos;
drop policy if exists photos_owner_delete on photos;

create policy photos_tiered_read on photos for select using (
  is_active_member() and (
    is_owner_or_admin()
    or (job_id is not null and exists (
      select 1 from job_assignments a
      where a.job_id = photos.job_id and a.user_id = auth.uid()))
    or (service_call_id is not null and exists (
      select 1 from service_calls s
      where s.id = photos.service_call_id and s.created_by = auth.uid()))
  )
);
create policy photos_tiered_insert on photos for insert with check (
  is_active_member() and (
    is_owner_or_admin()
    or (job_id is not null and exists (
      select 1 from job_assignments a
      where a.job_id = photos.job_id and a.user_id = auth.uid()))
    or service_call_id is not null
  )
);
create policy photos_owner_update on photos for update
  using (is_active_member() and (taken_by = auth.uid() or is_owner_or_admin()));
create policy photos_owner_delete on photos for delete
  using (is_active_member() and (taken_by = auth.uid() or is_owner_or_admin()));

-- Activity log: readable by members, append-only, actor stamped server-side.
drop policy if exists activity_auth_read on activity_log;
drop policy if exists activity_auth_insert on activity_log;
create policy activity_member_read   on activity_log for select using (is_active_member());
create policy activity_member_insert on activity_log for insert with check (is_active_member());

create or replace function stamp_activity_actor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.user_id = auth.uid();
    select name into new.user_name from profiles where id = auth.uid();
  end if;
  new.occurred_at = now();
  return new;
end;
$$;

drop trigger if exists activity_stamp_actor on activity_log;
create trigger activity_stamp_actor before insert on activity_log
  for each row execute function stamp_activity_actor();

-- ============================================================
-- E. TIMESHEETS: guard on INSERT and UPDATE, approver forced (hole 3)
-- ============================================================
drop policy if exists timesheets_self_read on timesheets;
drop policy if exists timesheets_self_insert on timesheets;
drop policy if exists timesheets_self_update_unapproved on timesheets;
drop policy if exists timesheets_admin_delete on timesheets;

create policy timesheets_self_read on timesheets for select
  using (is_active_member() and (employee_id = auth.uid() or is_owner_or_admin()));
create policy timesheets_self_insert on timesheets for insert
  with check (is_active_member() and (employee_id = auth.uid() or is_owner_or_admin()));
create policy timesheets_self_update_unapproved on timesheets for update
  using (is_active_member() and ((employee_id = auth.uid() and approved = false) or is_owner_or_admin()));
create policy timesheets_admin_delete on timesheets for delete
  using (is_owner_or_admin());

create unique index if not exists timesheets_employee_period_idx
  on timesheets (employee_id, week2_ending);

drop trigger if exists timesheet_approval_check on timesheets;
drop function if exists prevent_self_approval();

create or replace function timesheet_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  admin boolean := is_owner_or_admin();
begin
  if tg_op = 'INSERT' then
    if actor is not null and not admin then
      -- an employee files for themselves, never pre-approved
      new.employee_id := actor;
      new.approved := false;
      new.approved_by := null;
      new.approved_at := null;
    end if;
    if new.approved then
      if actor is not null then new.approved_by := actor; end if;
      if new.approved_by is null then
        raise exception 'Approval requires an approver';
      end if;
      if new.approved_by = new.employee_id then
        raise exception 'Self-approval not allowed: employees cannot approve their own timesheets';
      end if;
      if not user_can_approve(new.approved_by) then
        raise exception 'Only owners or PMs can approve timesheets';
      end if;
      new.approved_at := coalesce(new.approved_at, now());
    end if;
    return new;
  end if;

  -- UPDATE
  if actor is not null and actor = old.employee_id and old.approved then
    raise exception 'This timesheet is approved and locked';
  end if;
  if new.employee_id is distinct from old.employee_id and not (admin or actor is null) then
    raise exception 'Cannot reassign a timesheet';
  end if;

  if new.approved and not old.approved then
    if actor is not null then new.approved_by := actor; end if;
    if new.approved_by is null then
      raise exception 'Approval requires an approver';
    end if;
    if new.approved_by = new.employee_id then
      raise exception 'Self-approval not allowed: employees cannot approve their own timesheets';
    end if;
    if not user_can_approve(new.approved_by) then
      raise exception 'Only owners or PMs can approve timesheets';
    end if;
    new.approved_at := now();
  elsif old.approved and not new.approved then
    if not (admin or actor is null) then
      raise exception 'Only owners or PMs can un-approve a timesheet';
    end if;
    new.approved_by := null;
    new.approved_at := null;
  elsif old.approved and new.approved then
    -- keep the approval stamp immutable while approved
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$$;

drop trigger if exists timesheet_guard on timesheets;
create trigger timesheet_guard before insert or update on timesheets
  for each row execute function timesheet_guard();

-- ============================================================
-- F. STORAGE: bytes follow the table's visibility (hole 4)
-- Path convention for 'photos': job/<job_id>/<file>  or  sc/<service_call_id>/<file>
-- ============================================================
drop policy if exists photos_authenticated_read   on storage.objects;
drop policy if exists photos_authenticated_write  on storage.objects;
drop policy if exists photos_authenticated_delete on storage.objects;

-- Read: only if a photos row the caller can see (RLS applies inside) points here.
create policy photos_tiered_read on storage.objects for select using (
  bucket_id = 'photos' and is_active_member() and exists (
    select 1 from public.photos p where p.storage_path = storage.objects.name
  )
);
-- Upload: admins anywhere; crew under jobs they're assigned to; any member under sc/.
create policy photos_tiered_insert on storage.objects for insert with check (
  bucket_id = 'photos' and is_active_member() and (
    is_owner_or_admin()
    or ((storage.foldername(name))[1] = 'job' and exists (
      select 1 from public.job_assignments a
      where a.job_id::text = (storage.foldername(name))[2] and a.user_id = auth.uid()))
    or (storage.foldername(name))[1] = 'sc'
  )
);
-- Delete: the uploader of the linked photo row, or an admin (also for orphans).
create policy photos_tiered_delete on storage.objects for delete using (
  bucket_id = 'photos' and is_active_member() and (
    is_owner_or_admin()
    or exists (
      select 1 from public.photos p
      where p.storage_path = storage.objects.name and p.taken_by = auth.uid())
  )
);

drop policy if exists jobfiles_authenticated_read   on storage.objects;
drop policy if exists jobfiles_authenticated_write  on storage.objects;
drop policy if exists jobfiles_authenticated_delete on storage.objects;
create policy jobfiles_member_read on storage.objects for select
  using (bucket_id = 'job-files' and is_active_member());
create policy jobfiles_member_write on storage.objects for insert
  with check (bucket_id = 'job-files' and is_active_member());
create policy jobfiles_member_delete on storage.objects for delete
  using (bucket_id = 'job-files' and is_active_member());

drop policy if exists library_authenticated_read on storage.objects;
drop policy if exists library_admin_write        on storage.objects;
create policy library_member_read on storage.objects for select
  using (bucket_id = 'library' and is_active_member());
create policy library_admin_write on storage.objects for insert
  with check (bucket_id = 'library' and is_owner_or_admin());
create policy library_admin_delete on storage.objects for delete
  using (bucket_id = 'library' and is_owner_or_admin());
