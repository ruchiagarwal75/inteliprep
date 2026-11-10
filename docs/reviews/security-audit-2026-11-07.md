You're working on MockMeAI (this repo). I had a deep security audit done on commit `a59c3a5` and the live site. **No critical or high-severity vulnerabilities were found.** Fix the items below in order. Each one says what's wrong, why it matters, what to do and how to check it's done.

## What was checked

- **Code:** every API route, page, the proxy, auth and sign-out, admin access, resume tokens, invites, rate limits, input validation, rendering of AI output, SQL, database migrations and grants, browser storage, logging, scripts, CI and dependencies.
- **Live tests on localhost**, as both a signed-out and a signed-in user:
  - All 6 candidate APIs and all 5 admin APIs return 401 when signed out.
  - Admin writes are rejected signed out.
  - Tampered, swapped or mismatched resume tokens return 409.
  - Sending a message as "assistant", or sending a whole transcript, returns 400.
  - A mismatched account header returns 403.
  - Wrong content type returns 415, and oversized bodies return 413.
  - Bad invite input returns 400.
- **Production (mockmeai.com):** CSP with a nonce, `X-Frame-Options: DENY`, HSTS (2 years), `nosniff`, `Referrer-Policy` and `Permissions-Policy` are all present.
- **Secrets:** no server secret appears in the built browser files (`.next/static`, `.next/dev/static`). No real key or password appears anywhere in git history (only test fixtures and docs). No `.env` file was ever committed.

## Already solid (don't change)

- Sign-in tokens are verified on the server. Admin access re-checks the user with Supabase every time.
- Resume tokens are AES-GCM sealed and tied to the owner's account.
- The server rebuilds the transcript itself and never trusts one sent by the browser.
- All SQL is parameterized. Strict schemas reject unknown fields.
- AI output and user text render as plain text (no HTML injection).
- Logs never contain message text, tokens or cookies.
- The reporting database user has minimal rights. The private problem rubrics never reach the browser.

---

## Medium

### 1. The invite check trusts the email without checking how the account was created

- **Where:** `public.is_beta_invited()` in `supabase/migrations/20261108050628_beta_invitations.sql`. It matches `auth.jwt()->>'email'` against the invite table.
- **Why:** If email/password sign-up is ever on in Supabase without email confirmation (or another sign-in provider is added that doesn't verify emails), someone could create an account with an invited person's email and get in without owning that inbox.
- **Fix:**
  - Add a new migration that also requires the account to come from Google, for example `and coalesce(auth.jwt()->'app_metadata'->>'provider','') = 'google'`. Users can't edit `app_metadata`.
  - Keep the admin bypass as it is.
  - Add a test that an approved email from a non-Google account is rejected.
  - Also list the Supabase dashboard step for me: turn off every sign-in provider except Google.
- **Done when:** A non-Google account with an invited email gets the "not invited" page.

### 2. Anyone can add rows to your database through visitor tracking

- **Where:** `POST /api/monitoring/viewer` (`src/app/api/monitoring/viewer/route.ts`) and the `viewer` limit in `src/lib/request-limits.ts` (`[60, 1_000, 10_000]` per IP).
- **Why:** The endpoint is public and writes a new `app_viewers` row for every new random `visitorId`. One IP can add 10,000 rows a day, and IPv6 users can rotate through millions of addresses. This can fill your Supabase disk, which would also hurt invites and reporting since they share the database, and it makes visitor numbers meaningless.
- **Fix:**
  - Add a shared daily cap on new viewer rows (a Redis counter, for example 2,000 a day) and skip inserts once it's reached.
  - Key unauthenticated rate limits on the IPv6 `/64` prefix instead of the full address (see item 6).
  - Lower the per-IP daily limit to something a real person would hit, like 50.
- **Done when:** Tests show inserts stop after the shared cap, and two IPv6 addresses in the same `/64` share one limit.

---

## Low

### 3. Interview history stays in the browser after sign-out

- **Where:** `src/lib/interview-database.ts` (IndexedDB). Sign-out doesn't remove it.
- **Why:** On a shared or library computer, the next person can open the browser dev tools and read past transcripts, drawings and scorecards. It's scoped per account in the app, but it's still plain data on disk.
- **Fix:** On sign-out, offer "Also remove my practice history from this browser" (checked by default on the not-invited page). Mention it on the privacy page.
- **Done when:** Signing out with the box checked deletes that user's IndexedDB data, with a test covering it.

### 4. Signed-out sessions keep working for up to an hour

- **Where:** `candidateIdentity()` uses `getClaims()`, which only checks the token's signature.
- **Why:** If you ban a user in Supabase, or they sign out on another device, their current token still works on candidate APIs until it expires (about 1 hour by default). Invite revocation already applies right away, so this is a small gap.
- **Fix:** Pick one and tell me which you chose:
  - call `getUser()` on `start` and `end` only (low traffic), or
  - lower the JWT expiry in Supabase to 15 minutes.
- **Done when:** It's documented in `docs/authentication.md`.

### 5. The CSP allows a third-party host

- **Where:** `src/lib/security-headers.ts` allows `https://esm.sh` in `font-src` and `connect-src`, because Excalidraw loads its fonts from there.
- **Why:** It's a runtime dependency on a third-party CDN, and it's an allowed destination for data if an XSS bug is ever found.
- **Fix:** Self-host the Excalidraw fonts (copy them to `public/` and set `window.EXCALIDRAW_ASSET_PATH`), then remove `esm.sh` from the CSP.
- **Done when:** The whiteboard fonts load with no `esm.sh` requests in the Network tab and no CSP errors.

### 6. Unauthenticated rate limits can be dodged with IPv6

- **Where:** `requestIdentity()` in `src/lib/request-limits.ts` hashes the full IP address.
- **Why:** One IPv6 home connection usually controls a whole `/64` (about 18 quintillion addresses), so per-IP limits on `viewer` and `clientError` are easy to get around.
- **Fix:** Normalize IPv6 addresses to their `/64` prefix before hashing. Leave IPv4 as is.
- **Done when:** Unit tests cover IPv4, IPv6 and IPv4-mapped IPv6.

### 7. The server announces its framework

- **Where:** Production sends `X-Powered-By: Next.js`.
- **Fix:** Add `poweredByHeader: false` to `next.config.ts`.
- **Done when:** The header is gone in production.

### 8. The health check is public

- **Where:** `GET /api/health` returns which configuration checks pass.
- **Why:** It's harmless today, but it tells anyone whether your setup is complete.
- **Fix:** Return only `{"status":"ok"}` or a 503 publicly, and keep the detailed checks in the server logs.
- **Done when:** The public response has no `checks` field.

### 9. Admin access depends on one Google account

- **Where:** `ADMIN_USER_ID`. Admin can see every user's email and approve invites.
- **Fix:** Nothing to change in code. Make sure that Google account uses a passkey or 2-step verification. Note this in `docs/admin.md`.

### 10. Known dependency warnings

- **Production:** 4 low warnings (KaTeX via Excalidraw). Already accepted in `CLAUDE.md`.
- **Development tools only:** 8 moderate warnings (for example `minimatch`). They don't ship to users. Let Dependabot update them and don't force-fix.

---

## Good to know (not vulnerabilities)

- Every API call now asks Supabase about the invite. If Supabase is down, the whole app returns 503. That's the safe way to fail, but it's worth an uptime alert.
- Auth cookies can be read by JavaScript. That's how Supabase's browser client works. The strict CSP is what protects them.

## When you're done

Send me a short summary:

- what you changed for each item, by number
- the files you changed
- your choice for item 4
- the Supabase dashboard steps for item 1
