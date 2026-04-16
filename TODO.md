# TODO

## Current state: single command, both paths verified

The action wraps `send` only — plain text and HTML body variants
both pass against SendGrid. There's no skipped command; the surface
is intentionally small.

## Potential additions — multi-provider

The action name is `w3-email-action`, not `w3-sendgrid-action`, so
the contract implies provider pluggability. Today we only support
SendGrid. Workflows that want to send via a different provider
can't.

- [ ] Resend — `https://api.resend.com/emails`. Simple REST, API-
      key auth, modern ergonomics. Good candidate for the second
      provider.
- [ ] Postmark — `https://api.postmarkapp.com/email`. Transactional
      focus.
- [ ] AWS SES — IAM-signed, different auth story. Adds bridge
      complexity but unlocks low-cost high-volume sending.
- [ ] SMTP fallback — a last-resort provider that takes raw SMTP
      config. Useful for self-hosted mail or testing against local
      MailHog / MailCatcher.

Provider dispatch should be by input (`provider: sendgrid|resend|
postmark|ses|smtp`) with shared input shape across providers where
possible.

## Potential additions — capability surface

- [ ] `send-batch` — SendGrid supports up to 1000 recipients per
      request with per-recipient personalization. Today we send one
      email at a time.
- [ ] `send-template` — SendGrid Dynamic Templates with merge-field
      data. Common for transactional flows.
- [ ] `add-contact` / `remove-contact` — SendGrid Marketing
      Campaigns list management. Out of scope if we stay
      transactional-only; in scope if we want to cover marketing.
- [ ] `verify-email` — the deliverability-check endpoint. Useful
      for workflows that want to validate an address before adding
      to a send list.

## Docs

- [ ] `docs/guide.md` covers the `send` happy path but doesn't show
      the attachment pattern (base64 payload, content type, etc.).
      Even in a single-command action, attachments are a separate
      shape worth documenting.
