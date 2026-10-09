# Decisions

Running record. Newest at the bottom. Each entry: date, who, decision, why.

## 2026-10-02 — Matt (via Opus 4.7 sessions)
- Domain: app.prestigemech.com. Admins day one: Matt + Scott Bell.
- Rollout: whole team day one (advised against; Matt's call).
- Timesheets private per employee; approvals by owner/PM only; no self-approval.
- Photos tiered by job assignment. Service calls permissive day one.

## 2026-10-09 — Jesse (takeover)
- **Invite-only logins.** No open signup. Matt is the admin. Enforced in the
  database (invites table + signup trigger), not only by the dashboard toggle.
- **White-label from the start.** Company name, logo, colours, timezone, pay
  period, number prefixes, role labels and progress categories are data in
  `org_settings` and catalog tables, never hardcoded. New tenant = new Supabase
  project + one settings row.
- **Pay period is a setting.** `org_settings.pay_period_anchor_end` +
  `pay_period_days`. Timesheet period ends must align to it once set.
- **No Phase 1 data migration.** Clean build; the artifact is a UI/UX spec only.
- **Separate from Hugo's HQ.** Own accounts, own repo, own files. Reuse lessons
  (RLS testing, timezone handling, permissions-as-data), not code or infra.
- **Harden before porting.** Migration 0002 closes the RLS holes found in the
  baseline before any feature UI is built.

## Open — need Matt
- Pay period anchor: the end date of any recent real pay period.
- Does every crew member get a login? (Profiles are keyed to auth users.)
- Confirm Scott Bell's role (owner vs pm) and email for the first invite.
