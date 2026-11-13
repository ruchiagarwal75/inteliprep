# Brand fixes 1 (review of the Shardling rebrand)

Do this after the current pixel-brand work is committed. Same rules as before: beta only, no production deploy, no `main`, no env or secret changes, no live model calls, no em dashes. `npm run check` and `npm run build`, one commit per item, push `beta`.

## 1. Remove mockmeai.com everywhere (High, security)

Ruchi got a refund for mockmeai.com on Nov 11, so she no longer owns it. Anyone can buy it.

If `https://mockmeai.com/auth/callback` is ever added to Supabase's allowed redirect URLs, or mockmeai.com to the Google OAuth origins, whoever buys the domain can start a Google sign-in from their site and receive a real user's login code. With PKCE they hold their own verifier, so they can swap that code for the user's session. That's an account takeover.

Fix:
1. Delete the `MOCKMEAI_REDIRECT_ENABLED` flag and the mockmeai.com / www.mockmeai.com hosts from `src/lib/domain-redirects.ts`. Keep the www.shardling.com to shardling.com redirect and its callback exception.
2. In docs/reviews/shardling-rebrand.md and docs/deployment.md, remove every step that adds or keeps mockmeai.com: the Supabase redirect URLs, the Google OAuth origins, "keep old domains attached" in Vercel and the env var row. Add one line: "mockmeai.com is not owned. Never allowlist it anywhere."
3. Add mockmeai.com to the brand audit as a blocked host, so a test fails if it shows up in redirect code or auth docs again.

## 2. Approval emails will fail until Resend verifies shardling.com (High, owner action)

`src/lib/approval-email.ts` now sends from `hello@shardling.com`. Until shardling.com is verified in Resend, approval emails from the beta preview fail.

Fix: in the admin invites panel, when sending fails, show the exact error and say "Verify shardling.com in Resend". Don't change the sender. Ruchi will verify the domain.
