-- 0004_public_branding.sql
-- The login and invite pages render before anyone is signed in, and
-- org_settings is readable only by signed-in users. Expose the handful of
-- branding fields through a security-definer function that anon may call.
-- Nothing sensitive is in the result: name, logo, colours, assistant name.

create or replace function public_branding()
returns table (
  company_name text,
  company_short text,
  logo_path text,
  color_primary text,
  color_secondary text,
  assistant_name text
)
language sql stable security definer set search_path = public as $$
  select company_name, company_short, logo_path, color_primary, color_secondary, assistant_name
  from org_settings
  limit 1;
$$;

revoke all on function public_branding() from public;
grant execute on function public_branding() to anon, authenticated, service_role;

-- A person may fix their own display name and phone from the Account page.
-- (profiles_self_update from 0001 already allows the row update; the
-- protect_profile_privileges trigger from 0002 blocks role/active/email.)
