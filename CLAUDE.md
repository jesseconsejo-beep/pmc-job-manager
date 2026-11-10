# PMC Job Manager — rules for anyone (and any Claude) working in this repo

Job, service-call and timesheet management for a small mechanical contractor, built
white-label. Next.js 15 App Router, TypeScript strict, Tailwind v4, Supabase
(Postgres + Auth + Storage), Vercel. Read `README.md` and `docs/DECISIONS.md` first.
The product plan and competitor audit live in the "PMC Job Manager Gameplan" doc
(link in README).

## Non-negotiables

1. **The database is the authorization.** Every read and write goes through the
   user's own Supabase session so Row Level Security applies. Never weaken a
   policy or trigger without adding a scenario to `supabase/tests/run.mjs` that
   proves the new behaviour, and never use the secret key outside
   `lib/supabase/admin.ts` and the existing invite/delete actions.
2. **Schema changes are migration files only.** Add `supabase/migrations/NNNN_*.sql`
   (next number, idempotent: `if not exists`, `drop ... if exists`), run
   `cd supabase/tests && npm test`, and update the README migration table.
   Never change tables or policies in the Supabase dashboard.
3. **White-label.** Nothing company-specific in code: names, logo, colours,
   prefixes, timezone, pay period, roles, categories and contact details are rows
   in `org_settings`, `role_catalog`, `progress_categories`. If you need a new
   per-company value, add a column or a catalog row, not a constant.
4. **Dates and times go through `lib/dates.ts`** in the org timezone. Never
   `toISOString().slice(0,10)` or `new Date().getDay()` for a calendar date.
5. **Files go browser → Supabase Storage directly**, never through a server
   action (4.5 MB limit). Photo paths are `job/<job_id>/<file>` or
   `sc/<service_call_id>/<file>`; storage policies enforce that.
6. **Every mutation logs activity** with `logActivity` from `lib/activity.ts`.
7. **No secrets in git.** `.env.local` is ignored; `.env.example` lists the names.
   Never print or paste key values into commits, docs or chat.
8. **Mobile first.** Usable at 375 px wide, 44 px tap targets, no horizontal page
   scroll. Foremen use this on iPhones on site.
9. **TypeScript strict, no `any`.** Hand-maintained row types in `lib/types.ts`;
   keep them in step with the migrations.

## How the code is organised

- `app/(app)/…` signed-in pages; each feature has `page.tsx` + client components +
  `actions.ts` (server actions). Pattern to copy: `app/(app)/jobs/[id]/tasks/`.
- `app/login`, `app/forgot`, `app/set-password`, `app/auth/confirm` are the only
  public routes. `middleware.ts` enforces session + active profile.
- `lib/session.ts`: `requireMember()`, `requireAdmin()`, `requireSuper()`.
  Tiers: developer > owner > manager > employee (`lib/roles.ts`).
- `components/ui.tsx` shared primitives. Theme tokens come from `org_settings`
  via CSS variables set in `app/layout.tsx`.
- `supabase/migrations` is the schema history; `supabase/tests` boots an embedded
  Postgres (no Docker) with stubs for Supabase's auth and storage schemas.
- `docs/phase1-artifact.jsx` is the original prototype and the UI/UX reference.

## Daily commands

```bash
npm run dev -- -p 3100          # app on http://localhost:3100 (dev database)
npm run lint && npx tsc --noEmit && npm run build
cd supabase/tests && npm test   # 48 RLS / trigger scenarios, ~40 s
```

Local dev uses Jesse's dev Supabase project (values in `.env.local`, ask for them).
The shared site is deployed from `main` by Vercel; every pull request gets its own
preview URL.

## Working together

- Branch per piece of work from `main`; open a pull request; CI must be green
  (lint, types, build, database suite) before merge. Small commits with a one-line
  summary and a body that says why.
- Decisions that change scope, money, roles or privacy are written into
  `docs/DECISIONS.md` with the date and who decided, before the code lands.
- Open questions for the client go in the Gameplan doc's decisions table, not in
  code comments.
- If two people (or two Claude sessions) touch the same area, the second one
  rebases on `main` before opening the PR; never force-push `main`.
- Applying migrations to a live database is a deliberate, announced step: say
  which numbers, on which project, and confirm with a verification query.

## Things that bit us already

- Supabase SQL editor: a bare `update` without `where` shows a taller warning
  dialog; "Success" can be stale from the previous run. Verify with a query.
- Supabase free tier: public sign-up must stay OFF; email templates can't be
  edited without custom SMTP; the built-in mailer sends only a few emails an hour.
- Invite and reset links work only on the device that requested them until
  custom SMTP + token-hash templates are set up.
- The app hardcodes a 50 MB PDF cap in `lib/job-files.ts` and `lib/library.ts`
  pending the storage work in Phase 0 of the gameplan.
