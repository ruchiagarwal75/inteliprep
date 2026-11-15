# Email branding

App email bodies use the approved Shardling pixel logo. Welcome, approval, new-user
and budget emails include HTML and their original plain-text fallback. The logo
is a public, recipient-independent PNG at `/brand/email/shardling-logo-v1.png`.
Clients that block remote images show the Shardling alt text. There are no tracking
pixels. The navy background preserves the wordmark in light and dark email clients.

Run `node scripts/build-email-brand.mjs` to reproduce the assets from existing SVGs.
Do not overwrite a versioned logo with new artwork. Use a new filename and update
the renderer for future messages.

## Durable delivery

Apply `20261115185104_branded_email_html.sql` before deploying the code, or use the
normal `npm run db:admin` setup for a fresh database. It adds nullable HTML columns
to both private email outboxes. New messages freeze HTML and text together. Old
queued messages remain plain text, preserving Resend's idempotent request body.
There is no backfill, resend or change to access approval.

## Inbox sender logo

Adding the logo inside an email does not set Gmail's sender icon. Gmail's BIMI
support requires a Verified Mark Certificate or Common Mark Certificate, along
with authenticated mail and an enforced DMARC policy. Availability in other inboxes
also depends on their provider. A Google OAuth logo is unrelated.

Checked on 2026-11-15: shardling.com has `v=DMARC1; p=none;`, no
`default._bimi` TXT record, and no logo certificate. No DNS change has been made.

To finish Gmail's sender logo:

1. Confirm the certificate issuer accepts the logo and that the business meets
   its VMC or CMC eligibility requirements. Certificate purchase needs the owner's
   approval. Do not assume an unregistered new logo qualifies for a CMC.
2. Audit SPF, DKIM and DMARC alignment for Resend and every other domain sender,
   including forwarding. Move DMARC to `p=quarantine` or `p=reject`, with `pct=100`,
   only after the owner approves the exact policy. Do not replace the domain's
   existing SPF record or email-routing records blindly.
3. Give the issuer `/brand/email/shardling-bimi.svg`, a square SVG Tiny PS file
   built losslessly from the existing mascot. Obtain the issuer's certificate chain
   as a publicly hosted PEM file. The issuer may impose additional asset checks.
4. Publish a `default._bimi.shardling.com` TXT record using the final asset and
   certificate URLs: `v=BIMI1; l=https://shardling.com/brand/email/shardling-bimi.svg; a=YOUR_HTTPS_PEM_URL`.
   This is a template, not a record to publish before the certificate exists.
5. Validate mail authentication and BIMI, then send a test with the owner's approval.
   Inbox providers decide whether and when to display the logo.

Sources: [Google BIMI requirements](https://knowledge.workspace.google.com/admin/security/set-up-bimi),
[Resend email fields](https://resend.com/docs/api-reference/emails/send-email),
[Resend retry keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
