begin;
-- New messages freeze their HTML alongside text. Old retries keep their exact body.
alter table interview_admin.beta_approval_emails add column if not exists html text;
alter table interview_admin.notifications add column if not exists html text;
commit;
