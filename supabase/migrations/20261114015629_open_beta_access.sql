-- Keep the existing RPC name and own-email RLS. Missing records now mean active
-- access; an explicit revoked decision always wins. No invitations are overwritten.
create or replace function public.is_beta_invited() returns boolean
language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null
    and coalesce(auth.jwt()->'app_metadata'->>'provider','')='google'
    and coalesce(auth.jwt()->>'email','')<>''
    and not exists (
      select 1 from interview_admin.beta_invites
      where email=lower(auth.jwt()->>'email') and not approved
    );
$$;
revoke all on function public.is_beta_invited() from public,anon;
grant execute on function public.is_beta_invited() to authenticated;
notify pgrst,'reload schema';
