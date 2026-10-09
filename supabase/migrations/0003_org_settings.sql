-- 0003_org_settings.sql
-- White-label foundation: everything company-specific becomes data.
--   org_settings        one row: name, brand, timezone, pay period, prefixes
--   role_catalog        roles as data (labels, admin/approval flags)
--   progress_categories the 11 mechanical categories + code references as data
--   pay_period_bounds() the one place the pay period is computed
-- New tenant = new Supabase project + run 0001..0003 + edit the settings row.

-- ============================================================
-- A. ROLE CATALOG
-- ============================================================
create table if not exists role_catalog (
  key text primary key,
  label text not null,
  rank int not null,                       -- lower = more senior
  is_admin boolean not null default false, -- sees everything, manages people
  can_approve_timesheets boolean not null default false,
  sort int not null default 0
);

insert into role_catalog (key, label, rank, is_admin, can_approve_timesheets, sort) values
  ('owner',          'Owner',           0, true,  true,  0),
  ('pm',             'Project Manager', 1, true,  true,  10),
  ('superintendent', 'Superintendent',  2, false, false, 20),
  ('foreman',        'Foreman',         3, false, false, 30),
  ('journeyman',     'Journeyman',      4, false, false, 40),
  ('apprentice',     'Apprentice',      5, false, false, 50),
  ('office',         'Office',          3, false, false, 60),
  ('service_tech',   'Service Tech',    4, false, false, 70),
  ('viewer',         'View only',       9, false, false, 80)
on conflict (key) do nothing;

alter table role_catalog enable row level security;
drop policy if exists role_catalog_member_read on role_catalog;
create policy role_catalog_member_read on role_catalog for select
  using (is_active_member() or auth.uid() is not null);
drop policy if exists role_catalog_owner_write on role_catalog;
create policy role_catalog_owner_write on role_catalog for all
  using (app_role() = 'owner') with check (app_role() = 'owner');

-- profiles.role and invites.role now reference the catalog instead of a hardcoded list
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles drop constraint if exists profiles_role_fkey;
alter table profiles add constraint profiles_role_fkey
  foreign key (role) references role_catalog(key);

alter table invites drop constraint if exists invites_role_check;
alter table invites drop constraint if exists invites_role_fkey;
alter table invites add constraint invites_role_fkey
  foreign key (role) references role_catalog(key);

-- Admin / approval checks now read the catalog
create or replace function user_is_admin(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p join role_catalog r on r.key = p.role
    where p.id = u and p.active = true and r.is_admin
  );
$$;

create or replace function user_can_approve(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p join role_catalog r on r.key = p.role
    where p.id = u and p.active = true and r.can_approve_timesheets
  );
$$;

-- ============================================================
-- B. ORG SETTINGS (single row)
-- ============================================================
create table if not exists org_settings (
  id boolean primary key default true check (id),
  company_name text not null,
  company_short text not null,
  legal_name text,
  logo_path text,                                  -- object in the public 'branding' bucket
  color_primary text not null default '#f5c518',   -- accent (buttons, active nav)
  color_secondary text not null default '#5b8db8', -- secondary accent
  timezone text not null default 'America/Vancouver',
  region text not null default 'BC',               -- drives stat-holiday helper, code refs
  pay_period_days int not null default 14 check (pay_period_days in (7, 14)),
  pay_period_anchor_end date,                      -- any real period end; null = not set yet
  week_start_dow int not null default 0 check (week_start_dow between 0 and 6),
  job_number_prefix text not null default 'M',
  service_number_prefix text not null default 'S',
  assistant_name text not null default 'Assistant',
  orders_from_email text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

alter table org_settings enable row level security;
drop policy if exists org_settings_read on org_settings;
create policy org_settings_read on org_settings for select
  using (is_active_member() or auth.uid() is not null);
drop policy if exists org_settings_owner_update on org_settings;
create policy org_settings_owner_update on org_settings for update
  using (app_role() = 'owner') with check (app_role() = 'owner');
-- no insert/delete policy: the row is seeded once per tenant

create or replace function stamp_org_settings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  if auth.uid() is not null then new.updated_by = auth.uid(); end if;
  return new;
end;
$$;
drop trigger if exists org_settings_stamp on org_settings;
create trigger org_settings_stamp before update on org_settings
  for each row execute function stamp_org_settings();

-- Tenant seed: PMC. A new tenant edits this row (or seeds its own).
insert into org_settings (company_name, company_short, legal_name, assistant_name, orders_from_email)
values ('Prestige Mechanical Contracting', 'PMC', 'Prestige Mechanical Contracting Ltd.',
        'MattGPT', 'orders@prestigemech.com')
on conflict (id) do nothing;

-- Public logo bucket (login page needs it before auth). Owner uploads.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read on storage.objects for select
  using (bucket_id = 'branding');
drop policy if exists branding_owner_write on storage.objects;
create policy branding_owner_write on storage.objects for insert
  with check (bucket_id = 'branding' and app_role() = 'owner');
drop policy if exists branding_owner_delete on storage.objects;
create policy branding_owner_delete on storage.objects for delete
  using (bucket_id = 'branding' and app_role() = 'owner');

-- ============================================================
-- C. PAY PERIOD
-- ============================================================
-- The period containing date d, from the anchor. Zero rows until the anchor is set.
--   k = floor((d - anchor - 1) / days) + 1  ->  period_end = anchor + k*days
create or replace function pay_period_bounds(d date)
returns table (period_start date, period_end date)
language sql stable security definer set search_path = public as $$
  select (x.e - s.pay_period_days + 1)::date, x.e::date
  from org_settings s
  cross join lateral (
    select s.pay_period_anchor_end
         + s.pay_period_days * (floor((d - s.pay_period_anchor_end - 1)::numeric / s.pay_period_days)::int + 1) as e
  ) x
  where s.pay_period_anchor_end is not null;
$$;

-- Timesheets must line up with the configured period once an anchor exists.
create or replace function timesheet_period_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  expected date;
begin
  select period_end into expected from pay_period_bounds(new.week2_ending);
  if expected is not null and expected <> new.week2_ending then
    raise exception 'Timesheet period must end on % (configured pay period), not %', expected, new.week2_ending;
  end if;
  if new.week1_ending <> new.week2_ending - 7 then
    raise exception 'week1_ending must be 7 days before week2_ending';
  end if;
  return new;
end;
$$;

drop trigger if exists timesheet_period_check on timesheets;
create trigger timesheet_period_check before insert or update on timesheets
  for each row execute function timesheet_period_check();

-- ============================================================
-- D. PROGRESS CATEGORIES + CODE REFERENCES AS DATA
-- ============================================================
create table if not exists progress_categories (
  key text primary key,
  label text not null,
  icon text,
  sort int not null default 0,
  code_title text,                              -- e.g. 'BCBC 2024 Book II Part 2'
  code_refs jsonb not null default '[]'::jsonb, -- [{ref, text}]
  enabled_default boolean not null default true,
  active boolean not null default true
);

alter table progress_categories enable row level security;
drop policy if exists progress_categories_member_read on progress_categories;
create policy progress_categories_member_read on progress_categories for select
  using (is_active_member());
drop policy if exists progress_categories_admin_write on progress_categories;
create policy progress_categories_admin_write on progress_categories for all
  using (is_owner_or_admin()) with check (is_owner_or_admin());

-- Seed generated from the Phase 1 artifact by tools/extract-catalog.mjs
-- (see supabase/seed/progress_categories.sql; kept inline so a fresh tenant
-- gets the catalog from migrations alone).
insert into progress_categories (key, label, icon, sort, code_title, code_refs) values
  ('demolition', 'Demolition', '✕', 0, 'WorkSafeBC OHS Regulation Part 20 + BCBC', '[{"ref":"OHS 20.112","text":"Cap/disconnect plumbing, gas, and electrical services before demo. Lock-out where required."},{"ref":"OHS 20.4","text":"Hazardous materials survey (asbestos, lead, mould) required before demo of any pre-1990 building."},{"ref":"BCBC 8.1","text":"Demolition permit may be required by AHJ. Confirm with municipality before starting."},{"ref":"OHS 6.1","text":"Asbestos sampling and abatement by qualified abatement contractor only."},{"ref":"TSBC SDC","text":"Gas appliance removal: licensed gas fitter must disconnect and cap. Notify Technical Safety BC for permitted gas work."}]'::jsonb),
  ('underground-sanitary', 'Underground Sanitary', '⬇', 10, 'BCBC 2024 Book II Part 2', '[{"ref":"2.4.4","text":"Below-ground DWV materials: ABS (CSA B181.1), PVC (CSA B181.2), cast iron (CSA B70), copper DWV (ASTM B306)."},{"ref":"2.4.6.4","text":"Slope: 3\" and larger min 1% (1:100); under 3\" min 2% (1:50). Max ~4% to prevent solids separation."},{"ref":"2.5.4","text":"Cleanouts: base of every stack, every change of direction >45°, max 15m intervals horizontal."},{"ref":"2.6.2","text":"Trench bedding: granular, compacted, free of rocks >25mm. Pipe fully supported."},{"ref":"2.4.10","text":"Building sewer: min 100mm diameter. Separate from storm unless combined system permitted."},{"ref":"2.4.8","text":"Backwater valves required where fixtures below street main elevation, accessible for service."}]'::jsonb),
  ('above-ground-sanitary', 'Above-Ground Sanitary', '▤', 20, 'BCBC 2024 Book II Part 2', '[{"ref":"2.5.3","text":"Fixture units (FU): WC=4, Lav=1, Sink=2, Shower=2, Tub=2, Floor drain=2. Total determines pipe size per Table 2.5.3.A."},{"ref":"2.6.2","text":"Vent sizing: min 32mm (1¼\"); combined vents per Table 2.6.2.A based on developed length and FU."},{"ref":"2.6.5","text":"Vent pipes: min 32mm, increase to 50mm where exposed to freezing on roof."},{"ref":"2.6.7","text":"Wet venting: max 4 fixtures, all on same floor, vent must be one size larger than drain."},{"ref":"2.5.7","text":"Traps required on every fixture except WC. Trap seal 50–100mm. Max 600mm trap arm to vent for 1¼\"."},{"ref":"2.6.6","text":"Vent termination: min 150mm above roof, 1m from any opening; 300mm in snow areas."},{"ref":"2.3.2","text":"Pipe support — horizontal ABS/PVC max 1.2m; cast iron 1.5m; vertical 3m or every floor."}]'::jsonb),
  ('domestic-water', 'Domestic Water', '◉', 30, 'BCBC 2024 Book II Part 4 + CSA B137', '[{"ref":"4.6.1","text":"Pipe sizing: based on fixture units + simultaneous demand. Min ¾\" to building, ½\" to most fixtures."},{"ref":"4.5.4","text":"Hot water delivery max 49°C (120°F) at lavatories, showers, tubs. Anti-scald valves required."},{"ref":"4.7.2","text":"Backflow prevention at every cross-connection. DCVA, RPBA, or AVB based on hazard level."},{"ref":"4.2.1.1","text":"Pressure test: 1.5x working pressure or 860 kPa min, hold 1 hour, no detectable loss."},{"ref":"4.4.3","text":"Insulation: hot water lines insulated per ASHRAE 90.1. Cold lines in unconditioned space insulated."},{"ref":"4.3.2","text":"Pipe support: copper ½\"–1\" max 1.8m horizontal, 3m vertical; PEX max 0.8m horizontal."},{"ref":"CSA B125.3","text":"Trim and components: low-lead compliance (≤0.25% lead) required for potable water systems."}]'::jsonb),
  ('hydronic-water', 'Hydronic Water', '◐', 40, 'CSA B214 + ASHRAE 90.1', '[{"ref":"B214 5","text":"Hydronic system materials: copper Type L/K, PEX-AL-PEX, or steel. Glycol systems use compatible materials only."},{"ref":"B214 6.3","text":"Air separators and expansion tanks required. Pre-charge tank to system fill pressure (typically 12 psi residential)."},{"ref":"B214 7","text":"Pressure test at 1.5x working pressure, hold 4 hours min, document for AHJ."},{"ref":"ASHRAE 90.1 6.4.4","text":"Pipe insulation: hot pipes >40°C insulated per table 6.8.3; cold loops insulated to prevent condensation."},{"ref":"B214 8","text":"Glycol systems: propylene glycol for potable-adjacent systems; ethylene only where no risk of cross-contamination."},{"ref":"B214 9","text":"Balancing valves on every branch circuit. Air vents at all high points. Drains at all low points."}]'::jsonb),
  ('insulation', 'Insulation', '▩', 50, 'ASHRAE 90.1 + BCBC 9.36', '[{"ref":"ASHRAE 90.1 6.4.4","text":"Pipe insulation thickness varies by pipe size, fluid temp, and conductivity. See Table 6.8.3."},{"ref":"BCBC 9.36.4","text":"BC Energy Step Code: building envelope and mechanical system insulation requirements per step level."},{"ref":"ASHRAE 90.1 5.4.3","text":"Duct insulation: supply and return ducts in unconditioned space min R-6 (cooling) or R-8 (heating climates)."},{"ref":"CAN/ULC-S102","text":"Insulation materials must meet flame spread ≤25 / smoke developed ≤50 for plenum applications."},{"ref":"NIA Std","text":"Vapor barrier required on cold piping (chilled water, refrigerant suction) to prevent condensation damage."}]'::jsonb),
  ('natural-gas', 'Natural Gas', '🔥', 60, 'CSA B149.1 (Natural Gas and Propane Installation Code)', '[{"ref":"B149.1 6","text":"Pipe sizing: based on BTU load, length, and pressure drop. See sizing tables for 7\" w.c. and 2 psi systems."},{"ref":"B149.1 6.18","text":"Materials: black iron, CSST (with bonding), copper (where permitted), or PE for underground."},{"ref":"B149.1 6.20","text":"Pressure test: 1.5x working pressure or 14 kPa min, hold per test pressure schedule, document for TSBC."},{"ref":"B149.1 7","text":"Venting per Annex B (Cat I) or manufacturer spec (Cat II/III/IV condensing)."},{"ref":"B149.1 8","text":"Combustion air: dedicated supply per Annex F. Min 1 sq inch per 1000 BTU input for high-low openings."},{"ref":"TSBC GAS","text":"Gas work in BC requires licensed gas fitter (G-A or G-B). Permits via Technical Safety BC."},{"ref":"B149.1 6.16","text":"CSST: bonded per manufacturer (typically #6 AWG copper to electrical grounding system)."}]'::jsonb),
  ('equipment', 'Equipment', '⚙', 70, 'Manufacturer + BCBC + TSBC', '[{"ref":"Mfr install","text":"Always follow manufacturer install instructions exactly — they override generic code where stricter."},{"ref":"BCBC 6.2.2","text":"Clearances to combustibles per appliance label. Service access min 24\" front, 6\" sides typical."},{"ref":"BCBC 6.2.3","text":"Equipment seismic restraint required per BCBC 4.1.8 in BC. Tank straps, isolators with snubbers."},{"ref":"CSA B51","text":"Boilers and pressure vessels: registration with TSBC required above thresholds (typically 30 kW boiler)."},{"ref":"B149.1 8","text":"Gas equipment: licensed gas fitter, TSBC permit, combustion analysis at startup."},{"ref":"BCBC 6.2.6","text":"Condensate management: trap, neutralizer for condensing appliances, drain to approved disposal point."}]'::jsonb),
  ('hvac', 'HVAC', '◈', 80, 'SMACNA HVAC Duct Construction Standards 4th Ed. + ASHRAE 62.1', '[{"ref":"SMACNA 1-3","text":"Duct gauge: 26 ga min for rectangular up to 30\" at 1\" w.g.; increases by pressure class and size."},{"ref":"SMACNA 4-2","text":"Hanger spacing: rectangular max 8ft (2.4m); round max 12ft (3.6m); flat oval max 8ft."},{"ref":"SMACNA 2-1","text":"Seal classes: A (all joints), B (transverse+longitudinal), C (transverse only). Class A for >2\" w.g."},{"ref":"ASHRAE 62.1","text":"Min ventilation rates: office 5 cfm/person + 0.06 cfm/sf; classroom 10 cfm/person + 0.12 cfm/sf."},{"ref":"SMACNA 5","text":"Flex duct: max 6ft length, fully extended, supported every 4ft, no sharp bends (min radius = duct dia)."},{"ref":"BCBC 6.2.3","text":"Fire dampers at rated wall/floor penetrations, return air openings in shafts. Per CAN/ULC-S112."},{"ref":"SMACNA 7","text":"Test, adjust, balance (TAB) required for commissioning. Document airflows at all terminals."}]'::jsonb),
  ('controls', 'Controls', '⌘', 90, 'ASHRAE 90.1 + manufacturer', '[{"ref":"ASHRAE 90.1 6.4.3","text":"Controls requirements: thermostatic, zone, optimum start/stop, setback for off hours."},{"ref":"ASHRAE Guideline 36","text":"High-performance sequences of operation for VAV, AHU, terminal units, plant control."},{"ref":"BCBC 9.36","text":"BC Energy Step Code: controls support energy targets per step level (DCV, economizer, etc.)."},{"ref":"Mfr commissioning","text":"Point-to-point checkout, sequence of operation verification, trend logs for 30 days post-startup."},{"ref":"BACnet/MS-TP","text":"Open-protocol controls preferred (BACnet) to avoid vendor lock-in for future service."}]'::jsonb),
  ('ac', 'AC / Refrigeration', '❄', 100, 'CSA B52 Mechanical Refrigeration Code', '[{"ref":"B52 4","text":"Refrigerant classification: A1 (R-410A, R-32, R-454B) safest for occupied space; higher classes need ventilation/detection."},{"ref":"B52 5.3","text":"Maximum refrigerant charge per occupied space volume — see Table 5.3.1.A for each refrigerant."},{"ref":"B52 6","text":"Piping: ACR copper Type L, brazed joints (silver brazing alloy >700°C), nitrogen purge during brazing."},{"ref":"B52 7","text":"Pressure test: 1.1x design high-side pressure with dry nitrogen, hold 1 hour, no loss."},{"ref":"B52 8","text":"Triple evacuation to <500 microns before charging. Document micron readings."},{"ref":"TSBC EOR","text":"Refrigerant handling: ODP/ECP card required (Environment Canada). Refrigerant log maintained."},{"ref":"Mfr startup","text":"Manufacturer startup: superheat/subcool readings, amp draw, refrigerant charge confirmation, commissioning report."}]'::jsonb)
on conflict (key) do nothing;
