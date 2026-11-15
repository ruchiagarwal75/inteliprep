# Mock beta requests

The Mock catalog offers per-interview beta trials. This is separate from signing in,
the Free/Pro plan and the earned RAG boss reward. All existing problem content stays
unchanged. Unbuilt course worlds remain outside this request flow.

## User flow

- A signed-in user can request a specific mock without completing the course first.
- The card says "Free during beta. Planned as a paid feature later."
- A request stays pending until the admin approves it. The user can check its status.
- Approval grants one attempt for that problem, using the existing level and duration
  choices. It does not grant Pro or unlock other questions.
- A successfully created interview consumes the trial. Retries reuse the same session.
  A failed creation or a spending-cap rejection consumes nothing.
- After use, the user can open that interview. Admin can
  grant another trial explicitly. Revocation blocks unused access; existing sessions
  and scorecards remain accessible.
- The free RAG boss still requires Topic 9 and has its own single-attempt record.

## Storage and ownership

Use two private reporting tables, scoped by environment. One request row per
verified account/problem records first visible exposure and the first request.
A grant row records each admin approval and its optional consumed session.
Requests are immutable from the candidate's point of view after submission.
Approval command IDs and request versions prevent duplicate or stale grants.

Candidate routes verify sign-in, invitations, origin and rate limits. Admin pages,
read functions and write functions verify the configured admin independently.
The browser cannot write these tables directly. RLS is enabled, public/anon/
authenticated access is revoked, and the existing reporting role owns server access.
No answer text, model prompt or new secret is stored.

A single per-player Postgres transaction/lock covers authorization, shared-budget
reservation, session publication and trial consumption. Existing request IDs fence
retries. Limits and the shared AI budget remain in force.

## Reporting

The admin queue lists who requested which mock and allows one-trial approval,
revocation and another explicit grant after use. Counts show unique verified
accounts per problem: seen, requested, approved, started, completed and repeat use.
Exposure is recorded only when the card is visible in a foreground tab, not merely
because it exists below the fold. Repeated views and requests do not inflate counts.
Completed/repeat usage reuse persisted interview outcomes. Admin and known test
accounts are excluded by default. Counts begin with this release; generic historical
Pro interest cannot be attributed to an individual question and is not backfilled.

## Choices

Granting Pro for each request was rejected because it grants broader access and
cannot measure demand per interview. A separate credit wallet was also rejected:
one grant row per approval gives a bounded trial with an audit trail and safe
retries, without introducing payments or a general entitlement framework.
