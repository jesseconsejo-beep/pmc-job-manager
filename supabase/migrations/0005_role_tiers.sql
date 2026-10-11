-- 0005_role_tiers.sql
-- Permissions attach to four fixed TIERS; job titles are labels under a tier
-- and can be renamed per company (white-label):
--   developer  everything, including owner management and company settings
--   owner      everything, company settings, can manage other owners
--   manager    sees all data, manages people below owner, approves timesheets
--   employee   own work only
-- Also: the last active owner/developer cannot be deactivated or deleted.

alter table role_catalog add column if not exists tier text;
update role_catalog set tier = case key
  when 'owner' then 'owner'
  when 'pm' then 'manager'
  else 'employee' end
where tier is null;

insert into role_catalog (key, label, rank, is_admin, can_approve_timesheets, sort, tier)
values ('developer', 'Developer', -1, true, true, -10, 'developer')
on conflict (key) do update set tier = 'developer', is_admin = true, can_approve_timesheets = true;

alter table role_catalog alter column tier set not null;
alter table role_catalog drop constraint if exists role_catalog_tier_check;
alter table role_catalog add constraint role_catalog_tier_check
  check (tier in ('developer','owner','manager','employee'));

-- Keep the flags consistent with the tier (the flags stay as the fast lookup).
create or replace function sync_role_flags() returns trigger
language plpgsql as $$
begin
  -- flags are derived from the tier; a title cannot out-rank its tier
  new.is_admin := new.tier in ('developer','owner','manager');
  new.can_approve_timesheets := new.tier in ('developer','owner','manager');
  return new;
end;
$$;
drop trigger if exists role_catalog_sync_flags on role_catalog;
create trigger role_catalog_sync_flags before insert or update on role_catalog
  for each row execute function sync_role_flags();
update role_catalog set tier = tier;  -- re-derive the flags for the seeded rows

-- Tier helpers
create or replace function user_tier(u uuid) returns text
language sql stable security definer set search_path = public as $$
  select r.tier from profiles p join role_catalog r on r.key = p.role
  where p.id = u and p.active = true;
$$;

create or replace function app_tier() returns text
language sql stable security definer set search_path = public as $$
  select user_tier(auth.uid());
$$;

-- "Super" = may manage company settings and other owners.
create or replace function is_super() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_tier() in ('developer','owner'), false);
$$;

-- ============================================================
-- Profiles: tier-aware privilege rules (replaces the owner-only wording)
-- ============================================================
create or replace function protect_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  old_tier text;
  new_tier text;
  actor_tier text := app_tier();
begin
  if auth.uid() is null then
    new.updated_at = now();
    return new;
  end if;

  if new.id is distinct from old.id or lower(new.email) is distinct from lower(old.email) then
    raise exception 'Profile id and email cannot be changed here';
  end if;

  if new.role is distinct from old.role or new.active is distinct from old.active then
    if not is_owner_or_admin() then
      raise exception 'Only managers and above can change roles or activation';
    end if;
    if new.id = auth.uid() then
      raise exception 'You cannot change your own role or activation';
    end if;
    select tier into old_tier from role_catalog where key = old.role;
    select tier into new_tier from role_catalog where key = new.role;
    if (old_tier in ('owner','developer') or new_tier in ('owner','developer'))
       and actor_tier not in ('owner','developer') then
      raise exception 'Only an owner or developer can grant or remove an owner-level role';
    end if;
    if (old_tier = 'developer' or new_tier = 'developer') and actor_tier <> 'developer' then
      raise exception 'Only a developer can grant or remove the developer role';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

-- Never lose the last person who can run the company.
create or replace function protect_last_super() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  losing boolean := false;
  remaining int;
begin
  if tg_op = 'DELETE' then
    losing := old.active and user_tier(old.id) in ('owner','developer');
  else
    losing := old.active and user_tier(old.id) in ('owner','developer')
              and (not new.active or (select tier from role_catalog where key = new.role) not in ('owner','developer'));
  end if;
  if losing then
    select count(*) into remaining
    from profiles p join role_catalog r on r.key = p.role
    where p.active and r.tier in ('owner','developer') and p.id <> old.id;
    if remaining = 0 then
      raise exception 'Cannot remove the last active owner or developer';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_last_super on profiles;
create trigger profiles_protect_last_super before update or delete on profiles
  for each row execute function protect_last_super();

-- Deleting a profile from the app goes through the auth admin API (the auth
-- user is removed and the profile cascades). Only supers may delete, enforced
-- here for direct deletes too. History (timesheets, activity_log) keeps its
-- RESTRICT foreign keys, so a person with records cannot be deleted; the app
-- says to deactivate instead (see 0006 for the soft references).
drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_read   on profiles for select using (is_owner_or_admin());
create policy profiles_admin_update on profiles for update using (is_owner_or_admin());
create policy profiles_admin_insert on profiles for insert with check (is_owner_or_admin());
create policy profiles_super_delete on profiles for delete using (is_super() and id <> auth.uid());

-- Invites: only supers may invite owner-level roles; only developers invite developers.
create or replace function guard_invite_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv_tier text;
  actor_tier text := app_tier();
begin
  new.email = lower(trim(new.email));
  if auth.uid() is null then return new; end if;
  select tier into inv_tier from role_catalog where key = new.role;
  if inv_tier in ('owner','developer') and actor_tier not in ('owner','developer') then
    raise exception 'Only an owner or developer can invite an owner-level role';
  end if;
  if inv_tier = 'developer' and actor_tier <> 'developer' then
    raise exception 'Only a developer can invite a developer';
  end if;
  new.invited_by = coalesce(new.invited_by, auth.uid());
  return new;
end;
$$;

-- Company settings, role catalog, branding: owner-level (owner or developer).
drop policy if exists org_settings_owner_update on org_settings;
create policy org_settings_super_update on org_settings for update
  using (is_super()) with check (is_super());

drop policy if exists role_catalog_owner_write on role_catalog;
create policy role_catalog_super_write on role_catalog for all
  using (is_super()) with check (is_super());

drop policy if exists branding_owner_write on storage.objects;
create policy branding_super_write on storage.objects for insert
  with check (bucket_id = 'branding' and is_super());
drop policy if exists branding_owner_delete on storage.objects;
create policy branding_super_delete on storage.objects for delete
  using (bucket_id = 'branding' and is_super());
