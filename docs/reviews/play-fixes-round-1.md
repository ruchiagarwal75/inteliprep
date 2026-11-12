# Play fixes, round 1

## 1. Written grading

Vercel Preview logs on November 12, 2026, at 01:00:31, 01:00:44 and 01:01:05 UTC
show `drill:failed` calls for `gpt-6.1-terra`, followed by provider status 401.
The model calls lasted 71 to 409 ms. Successful non-AI submissions around
01:01 to 01:02 confirm that deterministic grading and saving still worked.
The blocker is provider authentication, not a timeout or the daily quota.

No environment variables were changed. In Vercel, open **inteliprep → Settings →
Environment Variables**. Update **OPENAI_KEY**, targeting **Preview**, with a
valid key for the configured AI provider. Keep Production unchanged. The next
beta build must include the updated Preview setting. Never paste the key into
an issue or commit it.

Written grading now distinguishes provider failures, incomplete output and
invalid output. Logs include the safe provider code when recognized, the request
reference and server frames. Validation logs contain an issue count, not values.
Candidate responses keep a generic service message and preserve their saved
answer. A provider 401 never invalidates the candidate's login.
