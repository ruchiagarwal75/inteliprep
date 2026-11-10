-- Additive: historical outcomes remain unknown rather than being reclassified.
alter table interview_admin.interviews add column if not exists not_scored_reason text
  check (not_scored_reason in ('too_short','insufficient_stages'));
