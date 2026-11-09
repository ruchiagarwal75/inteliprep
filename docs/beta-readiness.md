# Beta readiness verification

## Priority 1

1. Configured opening questions: `711d3f5`. All eight problems at all three
   levels use their own closing question; rubric content stays server-only.
2. Early-ending warning: `7c4fb4c`. The scorer and UI share the one-third time
   threshold and two-stage rule. A 45-minute session needs 15 minutes; an hour
   needs 20. Keep going is primary below the time gate.
3. Skip ineligible grading: `3626a9e`. The server returns a neutral result
   without calling the provider. Reporting records the reason without changing
   completion status. The full check passed with 1,233 tests, and build passed.
4. Whiteboard: **not reproduced** on the current production build. A 300 by
   150 CSS-pixel drag produces a 300 by 150 scene rectangle at both 1280 by 800
   and 1920 by 1080, at native Chrome zoom 90%, 100% and 110%. Redis cache stays
   on one or two lines. The regression uses a temporary persistent Chrome
   profile and Chrome's own zoom selector, not CSS zoom, DPR emulation or pinch
   scaling. Eleven browser checks passed. No app-side scale workaround was
   added. No failing current revision exists to mark as bad in git bisect, so
   an offending commit cannot responsibly be identified from this reproduction.
5. Feedback: already implemented and shipped separately in `4a76800`.
   The local production browser checks submit and skip feedback, confirm its
   user/interview linkage in the admin page, and deny non-admin access. Existing
   history remains untouched.
6. Legal pages: already implemented. `/privacy`, `/terms` and `/sign-in` return
   200 on Production; both policy links appear on sign-in and in the footer.
   The privacy notice describes storage, OpenAI processing and deletion.

### Google console checklist for the owner

These settings cannot be established from repository code or a signed-out page.
No console settings or environment variables were changed for this work.

1. In the Google Cloud project that owns the OAuth client, open Google Auth
   Platform, then Branding.
2. Set the app name to MockMeAI and choose a support email you monitor.
3. Upload the existing square logo, `src/app/apple-icon.png`.
4. Add `mockmeai.com` to authorized domains. Keep the required Supabase domain
   and the existing OAuth callback URI.
5. Set homepage to `https://mockmeai.com`, privacy policy to
   `https://mockmeai.com/privacy`, and terms to `https://mockmeai.com/terms`.
6. Save, finish Google's verification if requested, and test a fresh Google
   sign-in to check the displayed name and logo.

More detail: [authentication setup](authentication.md#google-console-rebrand-checklist-operator-action).

## Beta funnel definitions

`/admin/funnel` shows seven milestones for an inclusive UTC date range, with
search, pagination, per-user counts and the existing admin/test exclusion.
Top counts are distinct users reaching each step in the period, not a signup
cohort. Per-user rows count persisted occurrences. The second-interview step
uses the user's second recorded eligible start across history, then applies
the selected date range to that milestone.

Starts, completions, non-skipped feedback and second starts reuse the existing
interview and feedback tables. Only sign-in sessions, verified scoring eligibility
and scorecard opens add events. Sign-in events use a hash of the verified Auth
session ID, never an access token. Eligibility uses server timing and answered
stages on the next meaningful server action. Viewing the scorecard is counted
only when an assessed card is actually visible; a too-short result is excluded.
Retries and refreshes use unique milestone keys. Tracking failure cannot block
the interview. Historical values for the three new milestones are unavailable;
the dashboard shows when their recording began.
