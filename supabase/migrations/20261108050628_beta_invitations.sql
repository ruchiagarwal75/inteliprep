-- Private invitation records. No history or interview records are modified.
create table if not exists interview_admin.beta_invites (
  email text primary key check (email = lower(btrim(email)) and length(email) between 3 and 254),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table interview_admin.beta_invites enable row level security;
revoke all on interview_admin.beta_invites from public, anon, authenticated;
grant select, insert, update on interview_admin.beta_invites to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.beta_invites;
create policy reporting_service on interview_admin.beta_invites
  to mockmeai_reporting using (true) with check (true);

-- Candidates can read only their own membership, never other emails or audit metadata.
grant usage on schema interview_admin to authenticated;
grant select (email, approved) on interview_admin.beta_invites to authenticated;
drop policy if exists own_invite on interview_admin.beta_invites;
create policy own_invite on interview_admin.beta_invites for select to authenticated
  using ((select auth.uid()) is not null and email = (select lower(auth.jwt()->>'email')));

-- A no-argument, read-only RPC exposes one boolean through the existing Auth client.
-- SECURITY INVOKER keeps the caller's RLS/column restrictions in force.
create or replace function public.is_beta_invited() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from interview_admin.beta_invites
    where email = lower(auth.jwt()->>'email') and approved
  );
$$;
revoke all on function public.is_beta_invited() from public, anon;
grant execute on function public.is_beta_invited() to authenticated;
notify pgrst, 'reload schema';
