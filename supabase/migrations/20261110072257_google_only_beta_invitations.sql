-- Additive provider restriction. Existing invitation and interview records are retained.
-- Keep the caller's RLS and column grants; app_metadata is not user-editable.
create or replace function public.is_beta_invited() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(auth.jwt()->'app_metadata'->>'provider','') = 'google'
    and exists (
      select 1 from interview_admin.beta_invites
      where email = lower(auth.jwt()->>'email') and approved
    );
$$;
revoke all on function public.is_beta_invited() from public, anon;
grant execute on function public.is_beta_invited() to authenticated;
notify pgrst, 'reload schema';
