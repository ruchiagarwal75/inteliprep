# Guest Play

Guests use Supabase anonymous Auth. Progress, XP and stars use the same user UUID
as registered accounts. `GUEST_TOPIC_COUNT` in `src/lib/play/guest-policy.ts`
currently opens Topic 0 and Topic 1. Brand-new guests see the existing welcome
intro first, including when they enter through a topic link. Completing or
skipping it is saved on their anonymous account and survives a Google upgrade.
Guests with existing practice progress continue without an automatic replay.
Later topics, reviews, gap cards, Mock, the boss, Progress and admin require a real account.

Normal `/sign-in` uses `signInWithOAuth`, including when the browser has a guest
session. It opens the selected Google account and its saved progress. The server
clears any unfinished guest-link marker before starting OAuth, keeping the guest
auth cookies until the exchange succeeds. Admin return destinations remain fixed.

Saving guest progress is an explicit `/sign-in?guest=1` or `guest=limit` choice.
It uses `linkIdentity`, and its callback accepts only the original guest UUID.
If Google already belongs to another account, the guest session stays intact and
the retry offers normal sign-in rather than attempting the same link again.
Both screens offer a link to the other choice. Signing in to an existing account
does not merge guest XP or change ownership of guest data. Clearing cookies,
changing browsers or replacing the guest session can make anonymous progress
inaccessible; the sign-in screen explains that guest XP stays separate.

## Model audit

- `/api/play/submit` calls `submitRoundAnswer` then `gradeDrill`. Only its legacy
  `pick_probe` and `tradeoff` definitions call `gradeWrittenAnswer` and
  `observedModelRequest`.
- All current course questions are static multiple choice. Guests can submit only
  current course attempts for allowed topics. Retired AI attempts are rejected.
- Both `gradeWrittenAnswer` and `reserveAiGrade` independently require a freshly
  verified real account. `ai-usage.ts` reserves quota; `grader-settings.ts` only
  supplies settings. Neither invokes a model itself.
- `/api/play/{activity,chest,next,profile,round,slides,topic-rating}` and
  `/api/play/{prompt,welcome,welcome/start,boss/cleared}` do not call a model.
  Welcome start and finish also allow guests and make no AI calls. Prompt and
  boss remain real-account-only. Chest is scoped to allowed topics;
  currently no chest exists in Topics 0 or 1.
- No `/play` page calls a provider. Actual mock calls are behind the existing
  real-account guards on `/api/interview/start`, `/api/chat` and
  `/api/interview/end`. Admin independently rejects anonymous users.

## Owner setup before enabling this in a deployment

No hosted settings or database changes were made by the agent.

1. In Supabase, select the app Auth project. Open Authentication, Sign In /
   Providers. Enable anonymous sign-ins and manual identity linking. The installed
   supabase-js version supports `linkIdentity` for an anonymous user.
2. Create a Cloudflare Turnstile widget for `shardling.com`, `www.shardling.com`
   and your stable beta hostname. Add localhost only if testing against local
   Auth with Turnstile. Use a normal managed widget.
3. In Supabase Settings, Authentication, Bot and Abuse Protection, enable CAPTCHA
   protection, choose Turnstile, and enter its secret key there. Never put the secret in a
   public env var. Keep Supabase's anonymous signup IP rate limit enabled
   (30 per hour is the usual default). Review this limit in Auth Rate Limits.
4. In Vercel, add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to Preview with the widget's
   public site key. Later add it to Production only when you approve launch.
   It requires a new build. Existing Supabase variables and resume secret stay
   unchanged. Production builds with no site key show sign-in instead of creating
   anonymous accounts. No new server secret is needed.
5. Review and apply both prepared migrations through the Supabase SQL Editor:
   `20261117015144_guest_google_invite_check.sql` accepts a trusted linked Google
   identity while rejecting guests and revoked accounts.
   `20261117022458_play_guest_events.sql` adds the four guest events to the
   existing event constraint. Alternatively, the existing operator processes
   `npm run db:admin` and `npm run db:play` apply them respectively. No progress
   or existing event records are deleted.
6. Auth URL Configuration must allow the stable beta URL followed by
   `/auth/callback`, plus `https://shardling.com/auth/callback` and the www version
   if used. Keep Google's provider callback as Supabase's `/auth/v1/callback`.
   Manual linking uses the page's own origin and the same fixed callback path.
7. Verify with a separate QA account. Test a new Google identity and an identity
   already used on Shardling. The latter must keep the guest session and explain
   that it cannot be linked. Do not test with the owner's account.

## Abuse limits and remaining risks

The app preflight limits creation to 3/minute, 15/hour and 30/day per IP, plus
2/minute, 5/hour and 10/day per signed browser-session cookie. Guest Play APIs
are limited to 60/minute, 600/hour and 3,000/day per guest Auth UUID, and
180/minute, 1,800/hour and 6,000/day per IP. Existing Redis enforcement is reused.
IP addresses are hashed; arbitrary forwarded headers are ignored outside Vercel.

The browser must call Supabase Auth directly so Supabase sees the visitor's IP.
Its public signup endpoint can bypass the app preflight. Supabase CAPTCHA and
native IP limits are therefore required, not optional substitutes for the app
limits. Anonymous accounts consume Auth MAU and database storage, but server
checks deny them model access. No cleanup job or billing settings were added.
Existing Auth policies use owner UUIDs, not merely the `authenticated` role.

Guest events are deduplicated in the existing Play event table: `guest_started`,
`guest_first_drill_done`, `guest_prompt_shown` and `guest_signed_in`. They contain
no email, answer text or IP. Guests do not enter invite checks, welcome email
flows or registered-signup counts. Real accounts retain the existing invite policy.

The sign-in screen detects common in-app webviews and offers a copy-link button.
Opening that link in another browser cannot carry guest cookies across browsers;
the banner says so. Email sign-in was not added. It would need an anonymous
email-linking/verification flow, delivery configuration and an explicit decision
to extend the current Google-only invite policy, not just another button.

Local validation uses stubbed Auth/model services and synthetic Postgres users.
No live model requests or deployment are part of this change.

Setup references: [anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous),
[Auth configuration](https://supabase.com/docs/guides/auth/general-configuration),
and [CAPTCHA protection](https://supabase.com/docs/guides/auth/auth-captcha).
