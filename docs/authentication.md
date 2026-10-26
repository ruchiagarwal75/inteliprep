# Candidate Google sign-in

Supabase Auth stores candidate accounts and login sessions. Redis retains temporary
interview progress/locks/quotas/scorecards. Each account’s full interview history
stays in its own IndexedDB database in the current browser and website origin.

## Provider setup

The InteliPrep Supabase project is `bjqjocrfsiprlvnitfuo`. Its Google provider callback is:

```text
https://bjqjocrfsiprlvnitfuo.supabase.co/auth/v1/callback
```

1. In the Google Cloud project, configure the consent screen for InteliPrep with
   External audience. During testing, add the test accounts under Audience.
2. Configure only the basic sign-in scopes: `openid`, email, and profile.
3. Create an OAuth client of type Web application. Add the Supabase callback above
   as an authorized redirect URI. Add `http://localhost:3000` and
   `https://inteliprep-ruchiagarwal75s-projects.vercel.app` as JavaScript origins.
4. Enter Google’s Client ID and Client Secret directly into Supabase’s Google
   provider settings, enable the provider, and save. The Google secret belongs in
   Supabase; the app does not need it.
5. In Supabase → Authentication → URL Configuration, use the stable beta origin as
   Site URL. Add these exact app return URLs:

```text
http://localhost:3000/auth/callback
https://inteliprep-ruchiagarwal75s-projects.vercel.app/auth/callback
```

The Google-to-Supabase callback and Supabase-to-app return URLs serve different
steps. Keep both configured. If using another local port, explicitly add that
origin and its `/auth/callback` return URL before testing it.

## App configuration

Set these in `.env.local`, and in Vercel for Preview only:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://bjqjocrfsiprlvnitfuo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use a modern `sb_publishable_...` key. It is intended for browser use; never use a
service-role or `sb_secret_...` key here. No privileged Supabase key, custom user
table, interview table, SQL policy, or webhook is needed for this browser-local
milestone. Install the pinned versions with `npm ci`. Restart local development
and create a new Preview build after changing public environment variables.

Keep `INTERVIEW_RESUME_SECRET`: Supabase login and interview progress tokens have
different purposes. Redis progress remains JSON; no new encryption layer is added.

## Verify the full flow

1. Open `/interview` while signed out: expect `/sign-in`. Direct start/chat/end/resume
   requests must return 401 before interview or model work.
2. Use Continue with Google. Confirm the callback returns to `/interview`, start
   an interview, enter a draft and draw, then refresh. Login and interview state
   must survive. `/api/health` checks auth configuration and Redis, not a live
   OAuth exchange or provider billing.
3. Sign out and sign in as a second account in the same browser. It must have
   separate history, drafts and active selection. A copied first-account session
   link or resume token must not open that account’s interview or cached scorecard.
4. Sign back in as the first account: its original browser history must reappear.
   Repeat sign-out while a reply streams and with another interview tab open.
   Old workspaces must disappear, and late replies must never enter the new account.
5. Use Back after sign-out. The previous workspace must remain hidden while the
   browser rechecks authentication. If a login expires, submitted text is already
   saved under the original account before redirecting to sign-in.

Automated tests exercise verified-identity handling, cross-account Redis/token
access (including expired records and cached scores), request quotas, browser
storage isolation, late work cancellation, callback redirects and sign-out CSRF.
Real Google sign-in still requires a browser test with actual candidate accounts.

The anonymous `inteliprep` browser database is left intact and hidden from account
history. Ownerless legacy server checkpoints cannot be claimed by a new account.
Do not delete or automatically import those saves during rollout.

Vercel Authentication remains enabled for the private beta. It controls access to
the deployment; Supabase separately identifies the candidate within the app.

## Local callback connection failures

If Google returns successfully but the app reports the sign-in service is
unavailable, check the sanitized `/auth/callback` server event. Its
`auth_exchange_connection` kind means the code exchange could not reach the
provider, while `auth_exchange_verifier` identifies missing PKCE browser state.
No authorization codes, cookie values or provider messages enter these events.
Next’s development request logger excludes the callback URL because its query
contains a one-time authorization code.

The local Node process must resolve and reach `bjqjocrfsiprlvnitfuo.supabase.co`.
An `ENOTFOUND` failure in an agent-launched process can require restarting the
server from a regular terminal outside that process’s restricted network context.
For machines hitting the file-watcher limit, use:

```bash
WATCHPACK_POLLING=1000 npm run dev -- --webpack --hostname 127.0.0.1 --port 3000
```

Start a fresh sign-in attempt after restoring connectivity. OAuth codes are
short-lived and single-use; do not copy an earlier callback URL or paste codes
into logs or support messages.

References: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google),
[Next.js cookie sessions](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
