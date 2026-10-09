# PMC Job Manager

Job, service-call and timesheet management for a small mechanical contractor.
Built for Prestige Mechanical Contracting (Surrey, BC); white-label by design:
every company-specific value lives in the database (`org_settings`, `role_catalog`,
`progress_categories`), never in code.

Stack: Next.js (App Router) + Supabase (Postgres, Auth, Storage) + Vercel.

## Layout

```
supabase/migrations/   numbered SQL, the only way the schema changes
supabase/seed/         generated seed fragments (inlined into migrations)
supabase/tests/        embedded-Postgres harness that attacks the RLS as different users
tools/                 one-off generators (catalog extraction from the Phase 1 artifact)
docs/                  decisions, the Phase 1 artifact (UI spec), original hand-applied schema
```

## Migrations

| # | Purpose | Prod status |
|---|---------|-------------|
| 0001_baseline | Schema as hand-applied on 2026-10-03 | applied (by hand) |
| 0002_hardening | Closes 4 RLS holes; invite-only signup; admin-only deletes; append-only audit | **to apply** |
| 0003_org_settings | White-label settings, role + category catalogs, pay-period function | **to apply** |

Apply to prod in order by pasting 0002 then 0003 into the Supabase SQL editor
(or `supabase db push` once the CLI is linked). Never edit tables in the dashboard.

### After applying 0002 in the Supabase dashboard
1. Authentication → Providers → Email: turn **off** "Allow new users to sign up".
   The invites table is defence in depth; this is the front door.
2. Confirm the owner row: `select email, role, active from profiles;`

## Tenant bootstrap (new company)

1. New Supabase project. Run 0001, 0002, 0003.
2. Edit the single `org_settings` row: name, short name, colours, timezone,
   `pay_period_anchor_end` (the end date of any real pay period), prefixes.
3. First owner: have them sign up (they land inactive), then run once:
   `update profiles set role = 'owner', active = true where email = '<owner email>';`
4. The owner invites everyone else from the Crew page (Invites → Supabase admin invite).

## Database tests

```bash
cd supabase/tests
npm install
npm test
```

Boots Postgres 17 locally (no Docker), installs stubs for Supabase's `auth` and
`storage` schemas, applies every migration, then runs 34 scenarios as owner, PM,
foreman, deactivated user, uninvited signup and anon. `MIGRATE_UPTO=0001 npm test`
shows the same attacks succeeding against the unhardened baseline.

## Security model (enforced in the database, verified by the suite)

- Only active, invited members read or write anything. Anon and parked signups see nothing.
- Nobody changes their own role or activation. Only owners grant or remove `owner`.
- Timesheets are private per employee. Approval stamps the real approver, never
  self, never on insert, and an approved sheet is locked for its employee.
- Photo bytes in Storage are visible only where the photo row is visible
  (admins, or crew assigned to that job). Upload path convention:
  `job/<job_id>/<file>` or `sc/<service_call_id>/<file>`.
- Jobs and service calls are deleted by admins only. The activity log is append-only.

## Phase 1 reference

`docs/phase1-artifact.jsx` is the working prototype and the UI/UX spec for every
feature. It is not ported code; the data layer is rebuilt on the tables above.
