# Shardling rebrand

Beta only. No Production deployment, main update, live model call, paid test,
Vercel CLI command, Supabase CLI command or secret/environment change.

## Identity and artwork

The shared brand constant owns Shardling, its tagline, canonical origin and the
requested description. Titles use `%s | Shardling`, with the exact default
`Shardling: AI mock system design interviews`. OG and Twitter metadata share a
1200 x 630 light image. Public sitemap URLs use the same canonical origin.

The user rejected the initial crystal draft before it was committed and chose
the previous girl mascot's face for the logo. The original wave, working and done
poses, pixel guide poses, timing and hi! bubble are retained. The logo crops the
existing face without redrawing it. The lowercase wordmark uses local Nunito at
weight 800, licensed under OFL. Its color follows the theme text. No dependency
was added. `node scripts/build-brand-assets.mjs` regenerates static assets using
Next's installed font tools and the already-installed Sharp package.

Assets in public: `brand-mark.svg`, `brand-lockup.svg`, `favicon.svg`,
`favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` and
`og-image.png`. Next's `icon.svg`, `favicon.ico` and `apple-icon.png` use matching
art. `/manifest.webmanifest` declares the 192 and 512 icons.

No JSON-LD existed. There was no robots file; the new file preserves unrestricted
crawling and supplies the new host/sitemap. Existing page-level noindex/nofollow
remains unchanged. No authenticated/private URLs are added to the sitemap.

## Compatibility and remaining hits

[Every retained reference](shardling-legacy-brand-hits.json) includes its file,
line, exact text and reason. `node scripts/check-brand.mjs` rejects any new old-brand
reference not in that reviewed catalog. Its unit test also rejects a new UI string.
The audit scans tracked and untracked non-ignored text files, including source,
public SVGs, docs, package metadata, templates and migrations. Generated builds,
ignored screenshots, Git internals and binary files are excluded. The report and
its own audit catalog are excluded to avoid self-reference.

Retained categories:

- Package/repository/project names and real GitHub/Vercel/Supabase URLs still
  identify the existing resources. Renaming them is outside this task.
- Database roles, tables/settings, migrations, mmq7 keys, Redis namespaces,
  cryptographic contexts, cookies, browser storage, locks, events and retry keys
  stay compatible with existing users and records.
- The internal handwriting font alias and diagnostic prefix are not displayed copy.
- Tests intentionally use legacy hosts, persisted keys and negative brand examples.
- Historical reviews, authored specifications, original mascot-source comments and
  screenshot paths retain their original context. Deferred user files are untouched.
- Legacy domains occur in the required disabled redirect and its compatibility tests.

Privacy and Terms body wording is unchanged. Product references resolve through
BRAND. Their operator/contact wording names no old brand: it says to contact the
person who invited the user. No new legal claims or contact details were added.

## Environment variables for the owner

Set these in Vercel's dashboard for the environments being reviewed/released:

| Variable | Value | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://shardling.com` | Canonical metadata, sitemap and approval links. Public and read at build time. |
| `MOCKMEAI_REDIRECT_ENABLED` | `0` or unset | Keep legacy-domain redirects off until the new-domain sign-in is verified. Server only. |

Later, set `MOCKMEAI_REDIRECT_ENABLED=1` and rebuild/redeploy the intended environment
to enable the old-host redirect. No other identifier or existing key needs renaming.
The existing Resend key must permit the newly verified sending domain; if scoped
to the old domain, the owner must update its scope or replace it in the dashboard.

## Dashboard checklist, not performed by the agent

1. Vercel: open the existing inteliprep project, Settings, Domains. Add
   `shardling.com` and `www.shardling.com` to the intended environment after review.
   Follow the DNS values Vercel gives at the registrar and wait for TLS readiness.
   Keep both as project domains. Let the app handle the www redirect so OAuth
   callbacks can finish on their original host. Do not create a dashboard-wide
   redirect that would override the callback exception. Keep old domains and the
   stable beta URL attached. Do not change Preview protection.
2. Vercel: Settings, Environment Variables, set the two entries above and rebuild
   Preview. Production stays untouched until the owner reviews and releases beta
   through main. Adding the domain alone does not publish this beta code to main.
3. Supabase: open the existing IntelliPrep project `bjqjocrfsiprlvnitfuo`,
   Authentication, URL Configuration. Add exact return URLs for:
   `https://shardling.com/auth/callback`,
   `https://www.shardling.com/auth/callback`,
   `https://mockmeai.com/auth/callback`,
   `https://www.mockmeai.com/auth/callback`, and
   `https://inteliprep-git-beta-ruchiagarwal75s-projects.vercel.app/auth/callback`.
   Keep localhost and any existing active return URLs. Add each `?next=/admin`
   callback variant if using admin sign-in. Change Site URL to
   `https://shardling.com` only at the deliberate new-domain cutover.
4. Google Cloud: open the existing OAuth project's Google Auth Platform, Branding.
   Set App name to Shardling, upload `public/icon-192.png`, and set homepage,
   privacy and terms URLs to `https://shardling.com`, `/privacy` and `/terms`.
   Add `shardling.com` under Authorized domains. In the existing Web client, add
   the apex and www HTTPS JavaScript origins. Keep all old active origins and the
   Google-to-Supabase callback
   `https://bjqjocrfsiprlvnitfuo.supabase.co/auth/v1/callback` unchanged. Keep beta
   audience/test users and scopes unchanged. Complete any requested verification, then click Publish branding. Changes to the
   name, logo or domain may remain draft branding until verified and published.
5. Resend: add and verify `shardling.com`, install its exact DNS records, and confirm
   that the existing sending key can send from `hello@shardling.com`. Approval
   templates use `Shardling <hello@shardling.com>`. No test email was sent.
6. Test new sign-ins on apex, www and beta. Keep the legacy redirect flag off until
   these pass. Then enable the old-host redirect deliberately and retest. OAuth
   callbacks are exempt from cross-host redirects so in-flight PKCE codes keep
   their verifier cookies. Ordinary paths redirect with 308 and preserve the query.

Browser history is origin-scoped. Old attempts remain in their original host's
storage; moving domains does not transfer that storage or sign-in cookies.

## Verification and files

`npm run check` passes: lint, typecheck, formatting and 1,934 stubbed/local tests,
with two existing skips. `npm run build` and both private-content browser-chunk
scans pass. No live or paid tests ran. A built-server HTTP check confirms the www
308 preserves repeated query keys, including `tag=a&tag=b`, and that the legacy
host stays accessible while the flag is off. Unit tests cover enabled redirects,
callback exceptions and same-host code exchange on all five host forms.

The browser check visits Home and Sign in at 1440px and 375px, in both themes.
It checks titles, raw-source OG/Twitter/robots tags, canonical URLs, favicon and
manifest responses, local Nunito loading, theme persistence, console/hydration
errors and horizontal overflow. It blocks analytics and all API requests and
uses a fresh signed-out browser. It does not sign in with the owner's account.
Whiteboard export code is unchanged and its existing tests remain passing.

Screenshots under `artifacts/shardling/`:

| View | Light | Dark |
| --- | --- | --- |
| Home desktop | [1440](../../artifacts/shardling/home-light-1440.png) | [1440](../../artifacts/shardling/home-dark-1440.png) |
| Home phone | [375](../../artifacts/shardling/home-light-375.png) | [375](../../artifacts/shardling/home-dark-375.png) |
| Sign in desktop | [1440](../../artifacts/shardling/sign-in-light-1440.png) | [1440](../../artifacts/shardling/sign-in-dark-1440.png) |
| Sign in phone | [375](../../artifacts/shardling/sign-in-light-375.png) | [375](../../artifacts/shardling/sign-in-dark-375.png) |
| Header desktop | [1440](../../artifacts/shardling/home-header-light-1440.png) | [1440](../../artifacts/shardling/home-header-dark-1440.png) |
| Header phone | [375](../../artifacts/shardling/home-header-light-375.png) | [375](../../artifacts/shardling/home-header-dark-375.png) |

Files by change:

- Identity/metadata: `src/lib/{brand,site-metadata}.ts`, their tests,
  `src/app/{layout,robots,sitemap}.tsx/ts`, child page metadata, approval/copy
  tests, active operator docs, `package.json` description and `.env.example`.
- Assets: `public/brand*`, icons and font/license, Next icon conventions,
  `src/components/{brand,brand-face}`, the brand CSS Module and tests,
  `mascotArt.ts` static face export, its preservation test, Home hero and chat
  avatar, `src/app/{theme.css,manifest.ts}`, `scripts/build-brand-assets.mjs`.
- Domain/auth: `src/lib/{domain-redirects,oauth-callback}.ts`, redirect tests,
  `next.config.ts`, `google-sign-in.tsx`, callback tests and the cutover checklist.
- Audit: `scripts/check-brand.mjs`, `src/lib/brand-audit.test.ts` and the
  339-entry compatibility/historical catalog linked above.

The deferred `course-fixes-5.md` and `learn-mode.md` files remain untouched.

Dashboard references: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google branding verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).
