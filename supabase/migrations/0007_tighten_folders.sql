-- 0007_tighten_folders.sql
-- Gaps found while building the folders (2026-10-16):
--   1. photos: a row could point at ANY storage path, so a crew member assigned
--      to job A could link job A to a file under job B and read its bytes
--      through the storage read policy. Paths are now bound to the row's job
--      or service call, taken_by is stamped from the session, service_call_id
--      gets its missing foreign key, and a file can be referenced only once.
--   2. Orphaned photo files could not be cleaned up by anyone: admins may now
--      see every object in the photos bucket.
--   3. job-files bucket: any member could delete any file; now the uploader
--      of the linked row, or an admin.
--   4. jobs.enabled_categories was manager-only in the app but not the database.
--   5. RFI / CO numbers were unique only by app-side check (race window).
--   6. timesheets had no updated_at for optimistic concurrency.
--   7. org_settings gains the company contact block the letterheads print.

-- ------------------------------------------------------------
-- 1. photos: bound paths, stamped actor, real FK, unique file
-- ------------------------------------------------------------
delete from photos p where p.service_call_id is not null
  and not exists (select 1 from service_calls s where s.id = p.service_call_id);

alter table photos drop constraint if exists photos_service_call_id_fkey;
alter table photos add constraint photos_service_call_id_fkey
  foreign key (service_call_id) references service_calls(id) on delete cascade;

alter table photos drop constraint if exists photos_one_parent_check;
alter table photos add constraint photos_one_parent_check
  check ((job_id is null) <> (service_call_id is null));

create unique index if not exists photos_storage_path_idx on photos (storage_path);

create or replace function photo_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  expected text;
begin
  if auth.uid() is not null then
    new.taken_by := auth.uid();
  end if;
  if new.job_id is not null then
    expected := 'job/' || new.job_id::text || '/';
  else
    expected := 'sc/' || new.service_call_id::text || '/';
  end if;
  if left(new.storage_path, length(expected)) <> expected
     or length(new.storage_path) <= length(expected)
     or position('..' in new.storage_path) > 0 then
    raise exception 'Photo path must be under %', expected;
  end if;
  if tg_op = 'UPDATE' and new.storage_path is distinct from old.storage_path then
    raise exception 'A photo cannot be re-pointed at another file';
  end if;
  return new;
end;
$$;

drop trigger if exists photos_guard on photos;
create trigger photos_guard before insert or update on photos
  for each row execute function photo_guard();

-- ------------------------------------------------------------
-- 2. storage photos bucket: admins see everything (orphan cleanup)
-- ------------------------------------------------------------
drop policy if exists photos_tiered_read on storage.objects;
create policy photos_tiered_read on storage.objects for select using (
  bucket_id = 'photos' and is_active_member() and (
    is_owner_or_admin()
    or exists (select 1 from public.photos p where p.storage_path = storage.objects.name)
  )
);

-- ------------------------------------------------------------
-- 3. job-files bucket: delete by the uploader of the linked row, or an admin
-- ------------------------------------------------------------
drop policy if exists jobfiles_member_delete on storage.objects;
create policy jobfiles_member_delete on storage.objects for delete using (
  bucket_id = 'job-files' and is_active_member() and (
    is_owner_or_admin()
    or exists (
      select 1 from public.job_files f
      where f.storage_path = storage.objects.name and f.uploaded_by = auth.uid())
  )
);

-- ------------------------------------------------------------
-- 4. jobs.enabled_categories: managers and above only
-- ------------------------------------------------------------
create or replace function guard_job_categories() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and new.enabled_categories is distinct from old.enabled_categories
     and not is_owner_or_admin() then
    raise exception 'Only managers and above can change a job''s categories';
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_guard_categories on jobs;
create trigger jobs_guard_categories before update on jobs
  for each row execute function guard_job_categories();

-- ------------------------------------------------------------
-- 5. RFI / CO numbers unique per job
-- ------------------------------------------------------------
create unique index if not exists rfis_job_number_idx
  on rfis (job_id, lower(rfi_number)) where rfi_number is not null;
create unique index if not exists change_orders_job_number_idx
  on change_orders (job_id, lower(co_number)) where co_number is not null;

-- ------------------------------------------------------------
-- 6. timesheets.updated_at
-- ------------------------------------------------------------
alter table timesheets add column if not exists updated_at timestamptz not null default now();
drop trigger if exists timesheets_set_updated_at on timesheets;
create trigger timesheets_set_updated_at before update on timesheets
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 7. org_settings contact block (letterheads on work orders / timesheets)
-- ------------------------------------------------------------
alter table org_settings add column if not exists company_phone text;
alter table org_settings add column if not exists company_email text;
alter table org_settings add column if not exists company_address text;
