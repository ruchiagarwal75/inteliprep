# Candidate Google sign-in

Supabase Auth stores candidate accounts and login sessions. Redis retains temporary
interview progress/locks/quotas/scorecards. Each account’s full interview history
stays in its own IndexedDB database in the current browser and website origin.

## Provider setup

The InteliPrep Supabase project is `bjqjocrfsiprlvnitfuo`. Its Google provider callback is:

```text
https://bjqjocrfsiprlvnitfuo.supabase.co/auth/v1/callback
```

1. In the Google Cloud project, configure the consent screen for MockMeAI with
   External audience. During testing, add the test accounts under Audience.
2. Configure only the basic sign-in scopes: `openid`, email, and profile.
3. Create an OAuth client of type Web application. Add the Supabase callback above
   as an authorized redirect URI. Add `http://localhost:3000` and
   `https://inteliprep-ruchiagarwal75s-projects.vercel.app` as JavaScript origins.
4. Enter Google’s Client ID and Client Secret directly into Supabase’s Google
   provider settings, enable the provider, and save. The Google secret belongs in
   Supabase; the app does not need it.
5. In Supabase → Authentication → URL Configuration, use `https://mockmeai.com` as
   Site URL. Keep these exact app return URLs:

```text
http://localhost:3000/auth/callback
https://inteliprep-ruchiagarwal75s-projects.vercel.app/auth/callback
https://mockmeai.com/auth/callback
```

The Google-to-Supabase callback and Supabase-to-app return URLs serve different
steps. Keep both configured. If using another local port, explicitly add that
origin and its `/auth/callback` return URL before testing it.

## App configuration

Set these in `.env.local`, and in Vercel for Preview and Production:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://bjqjocrfsiprlvnitfuo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use a modern `sb_publishable_...` key. It is intended for browser use; never use a
service-role or `sb_secret_...` key here. The browser only uses the publishable key. Reporting credentials stay server-only and invitation records stay in the database. Install the pinned versions with `npm ci`. Restart local development
and create a new build in each affected environment after changing public variables.

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

## Distinguish sign-in from model outages

Only the verified account boundary sets `X-Interview-Auth-Error` to
`sign_in_required` (401) or `account_changed` (403). The browser invalidates its
account scope only for those matching status/marker pairs. Unmarked 401/403
responses, cross-origin rejections, quota failures, and dependency outages do not
erase the account scope or redirect to sign-in. Supabase unavailability is 503
without that marker, preserving the current page for recovery.

An expired model key, including `expired_secret_key`, produces a generic
interviewer-unavailable response with HTTP 503 rather than a candidate-login 401.
The failed candidate turn is retained as awaiting a reply, with a persistent
error and Retry reply. Pending state and a separate newly typed draft survive
browser saves and reloads; retry submits the original turn once. Completed
quiet listening checkpoints and completed replies do not need a retry. Grading
failures keep the existing ended state and original scorecard retry evidence.

Verify an expired provider key while signed in: stay on `/interview`, retain the
drawing and message, and show the retry notice. Restore provider access and retry
the reply without a duplicate candidate message. Separately expire the candidate
session: its marked 401 must still invalidate the workspace and require sign-in.

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


## Private-beta invitations

Sign in as the configured admin, open `/admin/access`, enter an exact Google
account email and choose **Approve access**. Changes apply on the next protected
request without redeploying. Use **Revoke** to withdraw access. No invitation email
is sent automatically. The database stores normalized exact emails, without domain
or wildcard matches. The configured `ADMIN_USER_ID` always has access through
verified Auth, never editable profile metadata. Every candidate API checks current
database membership before interview/model work. Uninvited accounts see
`/not-invited` and can sign out to switch accounts. A database outage returns
unavailable, never permission to practice or an app-login-expired marker.
Run `npm run db:admin` before deploying. It imports a legacy local
`MOCKMEAI_INVITED_EMAILS` list without overriding any existing row, including
revocations. Runtime checks do not read that variable. See [admin access](admin.md).
Google may still create an Auth account during OAuth; the account alone does not
grant app access. Vercel deployment protection remains a separate outer gate.

## Google console rebrand checklist (operator action)

These settings are outside the repository. In the Google Cloud console, select
**the project containing the OAuth client already used by this Supabase project**.
Do not create or replace the client, secret or callback during a branding change.

1. Open **Google Auth Platform → Branding** (or APIs & Services → OAuth consent
   screen in the older navigation).
2. Set **App name** to **MockMeAI**. Select a support email you monitor and keep
   the developer-contact email current.
3. Upload the existing MockMeAI square logo from `src/app/apple-icon.png` (also
   served at `https://mockmeai.com/apple-icon.png`). Google accepts PNG/JPG/BMP,
   under 1 MB, and recommends 120 × 120. Do not upload the SVG logo.
4. Under **App domain**, set:
   - Homepage: `https://mockmeai.com`
   - Privacy policy: `https://mockmeai.com/privacy`
   - Terms of service: `https://mockmeai.com/terms`
5. Under **Authorized domains**, add `mockmeai.com` and complete ownership
   verification if Google requests it. Keep the Supabase domain required by the
   existing callback configuration.
6. Under **Clients**, edit the existing Web application client. Include
   `https://mockmeai.com` in Authorized JavaScript origins. Preserve the redirect
   URI `https://bjqjocrfsiprlvnitfuo.supabase.co/auth/v1/callback` exactly.
7. Under **Audience**, keep External and Testing during private beta, with the
   intended test accounts. The Google test list and the app invitation list are
   separate controls. Keep Data Access limited to openid/email/profile.
8. Save. If Google requires branding verification, submit the updated branding.
   Google controls when the new name/logo appears. Before a public production
   verification, reviewers must be able to reach the homepage and policy links;
   coordinate that with the deliberate end of deployment-level beta protection.
9. Test a fresh Google sign-in, confirm the displayed branding and return to
   MockMeAI, and verify an invited account can start while an uninvited account
   sees the invitation notice.

Reference: [Google's OAuth branding settings](https://support.google.com/cloud/answer/15549049).

## November security follow-up

Invitation membership now also requires the verified JWT's immutable
`app_metadata.provider` to equal `google`. Editable profile metadata cannot grant
access. The independently authorized admin bypass is unchanged. Install the
additive Google-only migration with `npm run db:admin` before releasing the code.
Existing invitations, interviews and saved history are preserved.

Operator checklist: Supabase Dashboard, IntelliPrep, Authentication, Sign In /
Providers. Keep Google enabled. Disable Email/password, Phone, Anonymous sign-ins
and every other provider. Save and test both an invited Google account and an
uninvited account. These are dashboard steps; no provider, credential or JWT
expiry setting was changed by this patch.

We chose an online `getUser()` check for interview start and end operations, in
addition to verified claims and the current invitation check. Freeze/explicit exit
use the same end boundary. An Auth outage remains 503, not signed out. Chat and
resume still validate claims and current invitations on every request; invite
revocation remains the immediate access-withdrawal control. This adds the fresh
account check to low-frequency lifecycle actions without an Auth round trip on
every model turn. See [Supabase's server-side Auth guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

Sign-out keeps local history by default and offers an explicit removal checkbox.
The not-invited page defaults that checkbox on. Removal affects only the verified
account's browser database and its draft/dismissal copies. Other accounts and the
old unassigned `inteliprep` database are retained. An account-scoped local
invalidation marker prevents an already-open tab from restoring the removed data.

## Allow the beta preview to return from Google sign-in

The app builds its Supabase `redirectTo` from the current browser origin plus
`/auth/callback`. Its callback handler then redirects to a fixed path on that
same origin. No code or environment variable change is needed for the stable
beta hostname.

1. Open the [IntelliPrep Supabase project's URL Configuration](https://supabase.com/dashboard/project/bjqjocrfsiprlvnitfuo/auth/url-configuration).
2. Under **Authentication → URL Configuration**, keep **Site URL** set to
   `https://mockmeai.com`. This remains the production default.
3. Under **Redirect URLs**, choose **Add URL** and add this exact URL:

   ```text
   https://inteliprep-git-beta-ruchiagarwal75s-projects.vercel.app/auth/callback
   ```

4. Save. Keep the existing production and localhost callback entries.
5. Start a fresh sign-in from the [stable beta preview](https://inteliprep-git-beta-ruchiagarwal75s-projects.vercel.app/sign-in).
   Confirm the callback returns to that same beta hostname. Do not reuse an old
   OAuth callback URL or authorization code.

Use the stable branch URL when testing. If you deliberately test a deployment's
unique hostname instead, add that hostname's exact `/auth/callback` URL as well.
Avoid a broad wildcard across unrelated previews. Admin sign-in adds
`?next=/admin`; if testing that flow on the preview, allow its exact callback
variant too.

The Google Cloud OAuth client's redirect URI remains
`https://bjqjocrfsiprlvnitfuo.supabase.co/auth/v1/callback`. Do not replace it with
the app's beta callback: Google returns to Supabase, then Supabase returns to the
app. Vercel deployment protection is a separate gate; this allowlist does not
remove it or grant an account an app invitation. No dashboard settings were
changed while documenting these steps.

Reference: [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).
