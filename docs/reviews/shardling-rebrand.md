# Shardling rebrand

Beta only. No Production deployment, main update, live model call, paid test,
Vercel CLI command, Supabase CLI command or secret/environment change.

## Identity and artwork

The shared brand constant owns Shardling, its tagline, canonical origin and the
requested description. Titles use `%s | Shardling`, with the exact default
`Shardling: AI mock system design interviews`. OG and Twitter metadata share a
1200 x 630 light image. Public sitemap URLs use the same canonical origin.

The original girl mascot and its poses, timing and hi! bubble remain restored.
All 12 supplied source assets from `Claude outputs/shardling-brand.zip` stay
byte-for-byte intact under `public/brand/` and retain their recorded hashes.

The user then requested pixel artwork, pixel lettering and no white background.
`node scripts/build-pixel-brand.mjs` creates separate variants under
`public/brand/pixel/`, using only local rendering. The cylinder mascot uses a
40 x 44 grid with its original six-color palette. The wordmark uses the existing
licensed Press Start 2P font, converted to pixel rectangles. Logos, app icons and
favicons have transparent backgrounds. The social image uses navy rather than
white. No image model, paid service or new dependency is used.

Theme CSS chooses the dark or light transparent wordmark without filters. Both
Home heroes, every header and Sign in show the pixel lockup. Sign in uses the
pixel icon. The temporary custom face helper and unused logo-only Nunito font
are removed. Body and heading fonts are unchanged.

`python3 scripts/import-brand-assets.py <zip-or-folder>` imports the original set.
Run the pixel builder afterward to restore the derived app aliases. The original
source hashes in `scripts/brand-asset-sha256.json` remain unchanged. Tests verify
all source hashes, matching pixel aliases, integer pixel geometry and transparency.

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
- The unowned former domain occurs only in warnings, negative tests and historical records.

Privacy and Terms body wording is unchanged. Product references resolve through
BRAND. Their operator/contact wording names no old brand: it says to contact the
person who invited the user. No new legal claims or contact details were added.

## Environment variables for the owner

Set these in Vercel's dashboard for the environments being reviewed/released:

| Variable | Value | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://shardling.com` | Canonical metadata, sitemap and approval links. Public and read at build time. |

The obsolete redirect flag is removed. No storage identifier or existing key is
renamed. Only www-to-apex redirects for the owned domain are configured.

mockmeai.com is not owned. Never allowlist it anywhere.

The existing Resend key must permit the newly verified sending domain; if scoped
to the old domain, the owner must update its scope or replace it in the dashboard.

## Dashboard checklist, not performed by the agent

1. Vercel: open the existing inteliprep project, Settings, Domains. Add
   `shardling.com` and `www.shardling.com` to the intended environment after review.
   Follow the DNS values Vercel gives at the registrar and wait for TLS readiness.
   Keep both as project domains. Let the app handle the www redirect so OAuth
   callbacks can finish on their original host. Do not create a dashboard-wide
   redirect that would override the callback exception. Keep only the owned domains and the stable beta URL attached. Remove both
   host forms of the unowned former domain from the project. Do not change Preview protection.
2. Vercel: Settings, Environment Variables, set the canonical-origin entry above and rebuild
   Preview. Production stays untouched until the owner reviews and releases beta
   through main. Adding the domain alone does not publish this beta code to main.
3. Supabase: open the existing IntelliPrep project `bjqjocrfsiprlvnitfuo`,
   Authentication, URL Configuration. Add exact return URLs for:
   `https://shardling.com/auth/callback`,
   `https://www.shardling.com/auth/callback`,
   `https://inteliprep-git-beta-ruchiagarwal75s-projects.vercel.app/auth/callback`.
   Remove the unowned former domain from Redirect URLs and Site URL. Keep only
   owned beta and localhost return URLs. Add each `?next=/admin`
   callback variant if using admin sign-in. Change Site URL to
   `https://shardling.com` only at the deliberate new-domain cutover.
4. Google Cloud: open the existing OAuth project's Google Auth Platform, Branding.
   Set App name to Shardling, upload `public/icon-192.png`, and set homepage,
   privacy and terms URLs to `https://shardling.com`, `/privacy` and `/terms`.
   Add `shardling.com` under Authorized domains. In the existing Web client, add
   the apex and www HTTPS JavaScript origins. Remove the unowned former domain from Branding and JavaScript origins. Keep the
   Google-to-Supabase callback
   `https://bjqjocrfsiprlvnitfuo.supabase.co/auth/v1/callback` unchanged. Keep beta
   audience/test users and scopes unchanged. Complete any requested verification, then click Publish branding. Changes to the
   name, logo or domain may remain draft branding until verified and published.
5. Resend: add and verify `shardling.com`, install its exact DNS records, and confirm
   that the existing sending key can send from `hello@shardling.com`. Approval
   templates use `Shardling <hello@shardling.com>`. No test email was sent.
6. Test sign-in on the owned apex, www and beta hosts. Do not configure a redirect
   for the former domain. Keep only owned domains in Vercel, Supabase, Google and
   Resend. The www redirect preserves path/query and exempts OAuth callbacks so
   their PKCE cookies remain on the host that started sign-in.

Browser history is origin-scoped. Old attempts remain in their original host's
storage; moving domains does not transfer that storage or sign-in cookies.

## Verification and files

`npm run check` passes: lint, typecheck, formatting and 1,954 stubbed/local tests,
with two existing skips. `npm run build` and both private-content browser-chunk
scans pass. No live or paid tests ran. A built-server HTTP check confirms the www
308 preserves repeated query keys, including `tag=a&tag=b`, and no old-host redirect rule exists. Unit tests cover the owned www redirect,
callback exceptions and same-host code exchange on the owned test host forms.

The browser check visits Home and Sign in at 1440px and 375px, in both themes.
It checks titles, raw-source OG/Twitter/robots tags, canonical URLs, favicon and
manifest responses, supplied image loading and theme selection, theme persistence, console/hydration
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
- Assets: `public/brand*`, icons and Next icon conventions,
  `src/components/brand.tsx`, the brand CSS Module and tests,
  Home hero and chat avatar, `src/app/{theme.css,manifest.ts}`, the byte-preserving
  importer and source hashes. The temporary face helper is removed.
- Domain/auth: `src/lib/{domain-redirects,oauth-callback}.ts`, redirect tests,
  `next.config.ts`, `google-sign-in.tsx`, callback tests and the cutover checklist.
- Audit: `scripts/check-brand.mjs`, `src/lib/brand-audit.test.ts` and the
  344-entry compatibility/historical catalog linked above.

The deferred `course-fixes-5.md` and `learn-mode.md` files remain untouched.

Dashboard references: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google branding verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).
