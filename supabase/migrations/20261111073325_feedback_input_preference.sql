-- Nullable: existing feedback keeps its answers and needs no backfill.
alter table interview_admin.feedback
  add column if not exists input_preference text;

do $$
declare
  response_check text;
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='interview_admin.feedback'::regclass
      and conname='feedback_input_preference_check'
  ) then
    alter table interview_admin.feedback
      add constraint feedback_input_preference_check
      check (input_preference in ('talk','type','no_preference'));
  end if;

  -- Replace only the response-presence check, whose original name was generated.
  -- Keep source, ownership, length, choice, RLS and privilege constraints intact.
  for response_check in
    select conname from pg_constraint
    where conrelid='interview_admin.feedback'::regclass and contype='c'
      and pg_get_constraintdef(oid) like '%skipped%'
      and pg_get_constraintdef(oid) like '%liked%'
      and pg_get_constraintdef(oid) like '%would_return%'
      and pg_get_constraintdef(oid) like '%comment%'
  loop
    execute format('alter table interview_admin.feedback drop constraint %I', response_check);
  end loop;
  alter table interview_admin.feedback
    add constraint feedback_has_response check (
      skipped or liked is not null or would_return is not null
      or input_preference is not null or coalesce(length(btrim(comment)),0)>0
    );
end $$;
