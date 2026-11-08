-- Runtime reporting credentials cannot manage schemas, roles, or candidate sessions.
do $$
begin
  if not exists(select 1 from pg_roles where rolname='mockmeai_reporting') then
    create role mockmeai_reporting login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end $$;
do $$ begin
  if exists(select 1 from pg_roles where rolname='mockmeai_reporting' and (rolinherit or rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls)) then
    raise exception 'Reporting role has unexpected privileges';
  end if;
end $$;
grant usage on schema interview_admin to mockmeai_reporting;

-- Auth is Supabase-managed. Give only these column privileges, never table-wide SELECT.
grant select (id,email,created_at) on auth.users to mockmeai_reporting;

-- Preserve registered-user filtering without granting access to Auth status/secrets.
-- Deliberately owner-evaluated inside a private schema, with a fixed three-column projection.
-- DISTINCT makes this view non-updatable even if a future broad grant is mistaken.
create or replace view interview_admin.registered_users with (security_barrier=true) as
  select distinct id,email,created_at from auth.users where not is_anonymous and deleted_at is null;
revoke all on interview_admin.registered_users from public,anon,authenticated,mockmeai_reporting;
grant select on interview_admin.registered_users to mockmeai_reporting;

do $$
declare entry record;
begin
  for entry in select tablename from pg_tables where schemaname='interview_admin' loop
    execute format('grant select,insert,update on interview_admin.%I to mockmeai_reporting',entry.tablename);
    if not exists(select 1 from pg_policies where schemaname='interview_admin' and tablename=entry.tablename and policyname='reporting_service') then
      execute format('create policy reporting_service on interview_admin.%I to mockmeai_reporting using (true) with check (true)',entry.tablename);
    end if;
  end loop;
end $$;
-- No DELETE, schema CREATE, role membership, browser policies, or BYPASSRLS.
-- Set the login password separately; no credential belongs in a migration.
