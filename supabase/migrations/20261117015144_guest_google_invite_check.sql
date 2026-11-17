begin;
-- Linked Google identities are trusted Auth metadata, even if the first provider
-- was anonymous. Guests never qualify; explicit revocation still wins.
create or replace function public.is_beta_invited() returns boolean
language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    and (
      coalesce(auth.jwt()->'app_metadata'->>'provider','')='google'
      or coalesce(auth.jwt()->'app_metadata'->'providers','[]'::jsonb) @> '["google"]'::jsonb
    )
    and coalesce(auth.jwt()->>'email','')<>''
    and not exists (
      select 1 from interview_admin.beta_invites
      where email=lower(auth.jwt()->>'email') and not approved
    );
$$;
revoke all on function public.is_beta_invited() from public,anon;
grant execute on function public.is_beta_invited() to authenticated;
notify pgrst,'reload schema';
commit;
