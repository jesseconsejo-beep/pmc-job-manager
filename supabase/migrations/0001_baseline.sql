-- 0001_baseline.sql
-- The schema as applied to production by hand on 2026-10-03 (Supabase SQL editor).
-- Kept verbatim so the repo owns the history. ALREADY APPLIED in prod: mark it
-- applied, do not re-run it there. Fresh environments (tests, new tenants) run it.
-- Known holes in this file are closed by 0002_hardening.sql.

-- ============================================================
-- PMC JOB MANAGER — Phase 2 Database Schema
-- Run this ONCE in Supabase SQL Editor after creating the project.
-- ============================================================
-- This builds every table the app needs, sets up Row Level Security
-- (RLS) so users only see appropriate data, and creates helper views.
--
-- Run order: paste the whole file, click "Run".
-- ============================================================

-- ============================================================
-- 1. ENABLE EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- 2. USER PROFILES (links to Supabase Auth users)
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  role text not null default 'foreman' check (role in ('owner','pm','superintendent','foreman','journeyman','apprentice','office','service_tech','viewer')),
  phone text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile when user signs up
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 3. JOBS (contract jobs — "M" prefix in PMC system)
-- ============================================================
create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  job_number text,
  job_name text not null,
  client text,
  location text,
  start_date date,
  target_date date,
  notes text,
  status text not null default 'active' check (status in ('active','on_hold','complete','archived')),
  enabled_categories text[] default array['demolition','underground-sanitary','above-ground-sanitary','domestic-water','hydronic-water','insulation','natural-gas','equipment','hvac','controls','ac'],
  progress jsonb default '{}'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_created_by_idx on jobs(created_by);

-- ============================================================
-- 4. JOB ASSIGNMENTS (who's on what job)
-- ============================================================
create table if not exists job_assignments (
  job_id uuid references jobs(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role_on_job text default 'crew',
  assigned_at timestamptz not null default now(),
  primary key (job_id, user_id)
);

-- ============================================================
-- 5. CONTACTS (site contacts per job)
-- ============================================================
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. TASKS (top-level tasks + checklists with subtasks)
-- Model: items can be 'task' or 'folder'; folders have subtasks array
-- ============================================================
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  kind text not null default 'task' check (kind in ('task','folder')),
  text text not null,
  note text,
  due_date date,
  assignee_id uuid references profiles(id),
  done boolean not null default false,
  completed_at timestamptz,
  -- For folders: array of subtask objects stored as jsonb
  -- [{ id, text, done, due_date, assignee_id, created_at }]
  subitems jsonb default '[]'::jsonb,
  expanded boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists tasks_job_idx on tasks(job_id);
create index if not exists tasks_assignee_idx on tasks(assignee_id);
create index if not exists tasks_due_date_idx on tasks(due_date) where done = false;

-- ============================================================
-- 7. RFIs
-- ============================================================
create table if not exists rfis (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  rfi_number text,
  date_issued date default current_date,
  subject text not null,
  drawing_ref text,
  question text,
  response text,
  impact text,
  status text not null default 'issued' check (status in ('issued','action','complete')),
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. CHANGE ORDERS
-- ============================================================
create table if not exists change_orders (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  co_number text,
  date_issued date default current_date,
  subject text not null,
  drawing_ref text,
  description text,
  cost_impact numeric,
  schedule_impact_days integer,
  impact text,
  status text not null default 'issued' check (status in ('issued','action','complete')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. MATERIAL ORDERS (multi-item orders)
-- ============================================================
create table if not exists material_orders (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  supplier text,
  supplier_email text,
  po_number text,
  order_date date default current_date,
  expected_date date,
  notes text,
  items jsonb not null default '[]'::jsonb,
  -- items: [{ id, description, qty, unit, received, received_at }]
  last_sent_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists materials_job_idx on material_orders(job_id);
create index if not exists materials_expected_idx on material_orders(expected_date);

-- ============================================================
-- 10. TOOLS (per-job tools list with drop-off / pickup tracking)
-- Phase 2.5 will add master tool inventory; for now per-job list.
-- ============================================================
create table if not exists tools (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  name text not null,
  dropped_by_id uuid references profiles(id),
  dropped_by_text text,
  dropped_date date,
  picked_up boolean not null default false,
  picked_up_by_id uuid references profiles(id),
  picked_up_by_text text,
  picked_up_date date,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 11. PHOTOS (per job; files stored in Supabase Storage)
-- ============================================================
create table if not exists photos (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  service_call_id uuid,
  storage_path text not null,
  caption text,
  date date default current_date,
  taken_by uuid references profiles(id),
  taken_at timestamptz not null default now()
);

create index if not exists photos_job_idx on photos(job_id);
create index if not exists photos_service_idx on photos(service_call_id);

-- ============================================================
-- 12. JOB FILES (IFCs and Shop Drawings)
-- ============================================================
create table if not exists job_files (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  file_type text not null check (file_type in ('ifc','shop_drawing','other')),
  name text not null,
  revision text,
  date_issued date,
  storage_path text,
  external_url text,
  notes text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

-- ============================================================
-- 13. SERVICE CALLS (separate workflow from contract jobs — "S" prefix)
-- ============================================================
create table if not exists service_calls (
  id uuid primary key default uuid_generate_v4(),
  service_code text,
  customer_name text,
  company_name text,
  customer_phone text,
  customer_po text,
  address text,
  project_name text,
  scheduled_date date,
  status text not null default 'upcoming' check (status in ('upcoming','in_progress','complete','cancelled')),
  work_report text,
  work_entries jsonb default '[]'::jsonb,
  -- entries: [{ id, date, worker_id, worker_name, hours, material_source, parking, notes }]
  total_cost numeric,
  completed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists service_status_idx on service_calls(status);
create index if not exists service_scheduled_idx on service_calls(scheduled_date);

-- ============================================================
-- 14. TIMESHEETS (bi-weekly per employee)
-- ============================================================
create table if not exists timesheets (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references profiles(id),
  employee_name text,
  week1_ending date not null,
  week2_ending date not null,
  -- rows: [{ id, job_code, job_name, hours: [{reg, ot, dt}, ...14 days...] }]
  rows jsonb default '[]'::jsonb,
  total_hours numeric default 0,
  total_reg numeric default 0,
  total_ot numeric default 0,
  total_dt numeric default 0,
  notes text,
  approved boolean default false,
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists timesheets_employee_idx on timesheets(employee_id);
create index if not exists timesheets_period_idx on timesheets(week2_ending);

-- ============================================================
-- 15. SCHEDULE EVENTS (holidays, vacations, company events)
-- ============================================================
create table if not exists schedule_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  event_type text not null default 'event' check (event_type in ('holiday','vacation','dayoff','event')),
  start_date date not null,
  end_date date,
  who_id uuid references profiles(id),
  who_text text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists schedule_start_idx on schedule_events(start_date);

-- ============================================================
-- 16. BULLETIN BOARD POSTS
-- ============================================================
create table if not exists bulletin_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text,
  author_id uuid references profiles(id),
  author_name text,
  pinned boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists bulletin_pinned_idx on bulletin_posts(pinned) where archived = false;

-- ============================================================
-- 17. LIBRARY (codes, manuals, specs, PMC standards, safety)
-- ============================================================
create table if not exists library_docs (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in ('codes','manuals','specs','pmc_standards','safety')),
  title text not null,
  edition text,
  publisher text,
  tags text,
  notes text,
  storage_path text,
  external_url text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

create index if not exists library_category_idx on library_docs(category);

-- ============================================================
-- 18. ACTIVITY LOG (audit trail for everything)
-- ============================================================
create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  service_call_id uuid references service_calls(id) on delete cascade,
  user_id uuid references profiles(id),
  user_name text,
  event_type text not null,
  description text not null,
  metadata jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists activity_job_idx on activity_log(job_id, occurred_at desc);
create index if not exists activity_recent_idx on activity_log(occurred_at desc);

-- ============================================================
-- 19. NOTIFICATIONS (for Phase 2.5 push/email)
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text,
  link_path text,
  read boolean not null default false,
  read_at timestamptz,
  sent_via text[],
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx on notifications(user_id, read) where read = false;

-- ============================================================
-- 20. NOTIFICATION PREFERENCES
-- ============================================================
create table if not exists notification_prefs (
  user_id uuid references profiles(id) on delete cascade primary key,
  prefs jsonb not null default '{
    "tool_dropoff": ["in_app","push"],
    "tool_pickup": ["in_app","push"],
    "material_arriving": ["in_app","email"],
    "material_overdue": ["in_app","email","push"],
    "rfi_action_needed": ["in_app","push"],
    "rfi_overdue": ["in_app","email","push"],
    "co_issued": ["in_app","email"],
    "bulletin_pinned": ["in_app","push"],
    "daily_summary": ["email"]
  }'::jsonb
);

-- ============================================================
-- 21. ROW LEVEL SECURITY (RLS)
-- Default: authenticated users see everything; we tighten later.
-- ============================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table job_assignments enable row level security;
alter table contacts enable row level security;
alter table tasks enable row level security;
alter table rfis enable row level security;
alter table change_orders enable row level security;
alter table material_orders enable row level security;
alter table tools enable row level security;
alter table photos enable row level security;
alter table job_files enable row level security;
alter table service_calls enable row level security;
alter table timesheets enable row level security;
alter table schedule_events enable row level security;
alter table bulletin_posts enable row level security;
alter table library_docs enable row level security;
alter table activity_log enable row level security;
alter table notifications enable row level security;
alter table notification_prefs enable row level security;

-- Helper: check if user is owner or admin
create or replace function is_owner_or_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('owner','pm')
    and active = true
  );
$$ language sql security definer;

-- Profile policies
create policy "profiles_self_read" on profiles for select using (true);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);
create policy "profiles_admin_all" on profiles for all using (is_owner_or_admin());

-- Job policies (Phase 2 day-one: everyone authenticated can see all jobs)
-- Tighten in Phase 2.5 when we add role-based access
create policy "jobs_authenticated_read" on jobs for select using (auth.role() = 'authenticated');
create policy "jobs_authenticated_write" on jobs for all using (auth.role() = 'authenticated');

-- Same permissive default for all per-job data
create policy "contacts_auth_all" on contacts for all using (auth.role() = 'authenticated');
create policy "tasks_auth_all" on tasks for all using (auth.role() = 'authenticated');
create policy "rfis_auth_all" on rfis for all using (auth.role() = 'authenticated');
create policy "cos_auth_all" on change_orders for all using (auth.role() = 'authenticated');
create policy "materials_auth_all" on material_orders for all using (auth.role() = 'authenticated');
create policy "tools_auth_all" on tools for all using (auth.role() = 'authenticated');
-- Photos: Owners/PMs see all; foremen & crew see only photos from jobs they're assigned to
-- Service call photos: always visible to owners/PMs; visible to the tech who created the call
create policy "photos_tiered_read" on photos for select using (
  is_owner_or_admin()
  or (
    job_id is not null
    and exists (
      select 1 from job_assignments
      where job_assignments.job_id = photos.job_id
      and job_assignments.user_id = auth.uid()
    )
  )
  or (
    service_call_id is not null
    and exists (
      select 1 from service_calls
      where service_calls.id = photos.service_call_id
      and service_calls.created_by = auth.uid()
    )
  )
);

-- Insert: owners/PMs anywhere; crew only on jobs they're assigned to; service calls allowed if dispatched
create policy "photos_tiered_insert" on photos for insert with check (
  is_owner_or_admin()
  or (
    job_id is not null
    and exists (
      select 1 from job_assignments
      where job_assignments.job_id = photos.job_id
      and job_assignments.user_id = auth.uid()
    )
  )
  or service_call_id is not null
);

-- Update/delete: only the person who took the photo, or owners/PMs
create policy "photos_owner_update" on photos for update using (
  taken_by = auth.uid() or is_owner_or_admin()
);
create policy "photos_owner_delete" on photos for delete using (
  taken_by = auth.uid() or is_owner_or_admin()
);
create policy "files_auth_all" on job_files for all using (auth.role() = 'authenticated');
create policy "service_auth_all" on service_calls for all using (auth.role() = 'authenticated');
create policy "schedule_auth_all" on schedule_events for all using (auth.role() = 'authenticated');
create policy "bulletin_auth_all" on bulletin_posts for all using (auth.role() = 'authenticated');
create policy "library_auth_all" on library_docs for all using (auth.role() = 'authenticated');
create policy "activity_auth_read" on activity_log for select using (auth.role() = 'authenticated');
create policy "activity_auth_insert" on activity_log for insert with check (auth.role() = 'authenticated');
create policy "assignments_auth_all" on job_assignments for all using (auth.role() = 'authenticated');

-- Timesheets: PRIVATE per employee, visible to owners/PMs only.
-- Once approved, only owners/PMs can edit (locks the record from employee changes).
create policy "timesheets_self_read" on timesheets for select using (
  employee_id = auth.uid() or is_owner_or_admin()
);

-- Insert: employees can create their own timesheets only
create policy "timesheets_self_insert" on timesheets for insert with check (
  employee_id = auth.uid() or is_owner_or_admin()
);

-- Update: employees can edit their own UNAPPROVED timesheets;
-- owners/PMs can edit anything (including approval)
create policy "timesheets_self_update_unapproved" on timesheets for update using (
  (employee_id = auth.uid() and approved = false) or is_owner_or_admin()
);

-- Delete: only owners/PMs can delete (preserves history)
create policy "timesheets_admin_delete" on timesheets for delete using (
  is_owner_or_admin()
);

-- Prevent self-approval: an employee can't approve their own timesheet
-- Enforced at the database level via trigger
create or replace function prevent_self_approval() returns trigger as $$
begin
  -- If approval state is being set to true...
  if new.approved = true and (old.approved is null or old.approved = false) then
    -- ...the approver must NOT be the same person as the employee
    if new.approved_by = new.employee_id then
      raise exception 'Self-approval not allowed: employees cannot approve their own timesheets';
    end if;
    -- ...the approver must be set
    if new.approved_by is null then
      raise exception 'Approval requires approved_by to be set';
    end if;
    -- ...the approver must actually be an owner/admin
    if not exists (
      select 1 from profiles
      where id = new.approved_by
      and role in ('owner','pm')
      and active = true
    ) then
      raise exception 'Only owners or PMs can approve timesheets';
    end if;
    -- stamp the approval time
    new.approved_at = now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists timesheet_approval_check on timesheets;
create trigger timesheet_approval_check
  before update on timesheets
  for each row execute function prevent_self_approval();

-- Notifications: users only see their own
create policy "notifications_self" on notifications for all using (user_id = auth.uid());
create policy "prefs_self" on notification_prefs for all using (user_id = auth.uid());

-- ============================================================
-- 22. STORAGE BUCKETS
-- Run after the tables are created.
-- These create the buckets; policies are set in the dashboard.
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('photos', 'photos', false),
  ('job-files', 'job-files', false),
  ('library', 'library', false)
on conflict (id) do nothing;

-- Storage policies — authenticated users can read/write
create policy "photos_authenticated_read" on storage.objects for select
  using (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "photos_authenticated_write" on storage.objects for insert
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "photos_authenticated_delete" on storage.objects for delete
  using (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "jobfiles_authenticated_read" on storage.objects for select
  using (bucket_id = 'job-files' and auth.role() = 'authenticated');
create policy "jobfiles_authenticated_write" on storage.objects for insert
  with check (bucket_id = 'job-files' and auth.role() = 'authenticated');
create policy "jobfiles_authenticated_delete" on storage.objects for delete
  using (bucket_id = 'job-files' and auth.role() = 'authenticated');

create policy "library_authenticated_read" on storage.objects for select
  using (bucket_id = 'library' and auth.role() = 'authenticated');
create policy "library_admin_write" on storage.objects for insert
  with check (bucket_id = 'library' and is_owner_or_admin());

-- ============================================================
-- 23. SEED DATA (optional — adds Matt as owner on signup)
-- ============================================================
-- This runs as part of profile creation; if you want to make
-- yourself owner immediately after signing up, run this once:
--
--   update profiles set role = 'owner', name = 'Matt' where email = 'YOUR_EMAIL';
--
-- We'll do this together Saturday after you create your account.

-- ============================================================
-- DONE. If this ran without errors, your database is ready.
-- ============================================================
