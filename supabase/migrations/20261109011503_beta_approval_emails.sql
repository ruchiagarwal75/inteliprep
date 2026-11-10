-- Additive approval-email outbox. Existing approvals never trigger a backfill send.
create table if not exists interview_admin.beta_approval_emails (
  id uuid primary key,
  email text not null references interview_admin.beta_invites(email),
  approval_updated_at timestamptz not null,
  sender text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','unknown')),
  created_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  claimed_at timestamptz,
  sent_at timestamptz,
  provider_id text,
  failure_category text,
  reference_id uuid,
  unique (email, approval_updated_at)
);
alter table interview_admin.beta_approval_emails enable row level security;
revoke all on interview_admin.beta_approval_emails from public, anon, authenticated;
grant select, insert, update on interview_admin.beta_approval_emails to mockmeai_reporting;
drop policy if exists reporting_service on interview_admin.beta_approval_emails;
create policy reporting_service on interview_admin.beta_approval_emails
  to mockmeai_reporting using (true) with check (true);
