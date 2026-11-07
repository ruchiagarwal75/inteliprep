-- Server-only operational reporting. No transcripts, drawings, secrets or audio.
create schema if not exists interview_admin;
revoke all on schema interview_admin from public, anon, authenticated;

create table interview_admin.reporting_state (
  singleton boolean primary key default true check (singleton),
  started_at timestamptz not null default now()
);
insert into interview_admin.reporting_state default values;

create table interview_admin.interviews (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  environment text not null,
  is_test boolean not null default false,
  coverage text not null check (coverage in ('full','partial')),
  problem_id text not null,
  level text not null,
  status text not null default 'unfinished'
    check (status in ('unfinished','completed','exited','failed')),
  started_at timestamptz,
  deadline_at timestamptz,
  last_activity_at timestamptz,
  ended_at timestamptz,
  first_response_at timestamptz,
  design_presented_at timestamptz,
  feedback_status text not null default 'none'
    check (feedback_status in ('none','pending','generated','failed')),
  feedback_generated_at timestamptz,
  feedback_failed_at timestamptz,
  feedback jsonb,
  observed_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);
create index interviews_user_activity on interview_admin.interviews(user_id, last_activity_at desc);
create index interviews_environment_start on interview_admin.interviews(environment, started_at desc);

create table interview_admin.failures (
  id uuid primary key,
  request_id text not null,
  interview_id uuid,
  user_id uuid,
  environment text not null,
  is_test boolean not null default false,
  occurred_at timestamptz not null default now(),
  operation text not null,
  category text not null,
  reference_id text not null,
  source text not null check (source in ('server','browser_report')),
  unique (request_id, operation, reference_id)
);
create index failures_recent on interview_admin.failures(environment, occurred_at desc);
create index failures_interview on interview_admin.failures(interview_id, occurred_at desc);

create table interview_admin.ai_calls (
  id uuid primary key,
  request_id text not null,
  interview_id uuid,
  user_id uuid,
  environment text not null,
  is_test boolean not null default false,
  operation text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('pending','completed','failed','cancelled')),
  model text not null,
  provider_request_id text,
  input_tokens bigint,
  output_tokens bigint,
  cached_tokens bigint,
  cache_write_tokens bigint,
  estimated_cost_usd numeric(18,10),
  pricing_version text,
  check (input_tokens is null or input_tokens >= 0),
  check (output_tokens is null or output_tokens >= 0),
  check (cached_tokens is null or cached_tokens >= 0),
  check (estimated_cost_usd is null or estimated_cost_usd >= 0)
);
create index ai_calls_interview on interview_admin.ai_calls(interview_id, started_at);
create index ai_calls_recent on interview_admin.ai_calls(environment, started_at desc);

alter table interview_admin.reporting_state enable row level security;
alter table interview_admin.interviews enable row level security;
alter table interview_admin.failures enable row level security;
alter table interview_admin.ai_calls enable row level security;
revoke all on all tables in schema interview_admin from public, anon, authenticated;
revoke all on all sequences in schema interview_admin from public, anon, authenticated;
-- No browser-role policies: access is through the authenticated Next.js server only.
