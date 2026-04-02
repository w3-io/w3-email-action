---
title: Email
category: integrations
actions: [send]
complexity: beginner
---

# Email

This action sends transactional email from W3 workflows through a
unified interface that supports [SendGrid](https://sendgrid.com) and
[Resend](https://resend.com). It handles plain text, HTML, provider-side
templates with dynamic data, CC/BCC, reply-to, and file attachments.
Switch providers by changing one input -- the rest of the configuration
stays the same.

## Quick start

```yaml
- name: Send invoice email
  uses: w3-io/w3-email-action@v1
  with:
    provider: sendgrid
    api-key: ${{ secrets.SENDGRID_KEY }}
    to: customer@example.com
    from: noreply@yourapp.com
    from-name: Your App
    subject: Your invoice is ready
    body-html: <h1>Invoice #1234</h1><p>Amount due: $99.00</p>
```

## Commands

This action has no `command` input. It sends email on every invocation.
Configure the behavior through the inputs below.

## Inputs

| Input | Required | Default | Description |
| --------------- | -------- | ---------- | ----------------------------------------------------------------- |
| `provider` | yes | `sendgrid` | Email provider: `sendgrid` or `resend` |
| `api-key` | yes | | Provider API key |
| `to` | yes | | Recipient email (comma-separated for multiple) |
| `from` | yes | | Sender email address (must be verified with provider) |
| `from-name` | no | | Sender display name |
| `subject` | no | | Subject line (not required when using `template-id`) |
| `body-html` | no | | HTML email body |
| `body-text` | no | | Plain text email body (used as fallback if no HTML) |
| `cc` | no | | CC recipients (comma-separated) |
| `bcc` | no | | BCC recipients (comma-separated) |
| `reply-to` | no | | Reply-to email address |
| `template-id` | no | | Provider-side template ID (replaces body-html/body-text) |
| `template-data` | no | | JSON object of dynamic data for the template |
| `attachments` | no | | JSON array of attachments (see below) |

At least one of `body-html`, `body-text`, or `template-id` is required.

### Attachment format

```json
[
  {
    "filename": "report.pdf",
    "content": "<base64-encoded content>",
    "type": "application/pdf"
  }
]
```

## Outputs

| Output | Type | Description |
| ------------- | ------ | ------------------------------------------------- |
| `success` | string | `true` if the provider accepted the email |
| `status-code` | string | HTTP status code from the provider API |
| `result` | string | Full JSON result |

**Output (`result`) -- SendGrid:**

```json
{
  "statusCode": 202,
  "headers": {
    "x-message-id": "abc123def456"
  }
}
```

**Output (`result`) -- Resend:**

```json
{
  "id": "msg_abc123",
  "from": "noreply@yourapp.com",
  "to": ["customer@example.com"],
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

## Authentication

### SendGrid

1. Sign up at https://sendgrid.com
2. Create an API key under Settings > API Keys
3. Verify your sender identity (single sender or domain authentication)
4. Store the key as a secret

```yaml
with:
  provider: sendgrid
  api-key: ${{ secrets.SENDGRID_KEY }}
```

Free tier: 100 emails/day. API keys start with `SG.`.

### Resend

1. Sign up at https://resend.com
2. Add and verify your domain under Domains
3. Create an API key under API Keys
4. Store the key as a secret

```yaml
with:
  provider: resend
  api-key: ${{ secrets.RESEND_KEY }}
```

Free tier: 100 emails/day, 1 domain. API keys start with `re_`.

## Template email workflow example

Use a provider-side template with dynamic data to send branded
transactional emails without embedding HTML in your workflow.

```yaml
- name: Send welcome email with template
  uses: w3-io/w3-email-action@v1
  with:
    provider: sendgrid
    api-key: ${{ secrets.SENDGRID_KEY }}
    to: ${{ inputs.customer_email }}
    from: welcome@yourapp.com
    from-name: YourApp
    template-id: d-abc123def456
    template-data: |
      {
        "first_name": "${{ inputs.first_name }}",
        "plan_name": "Pro",
        "login_url": "https://app.yourapp.com/login"
      }
```

## Multi-recipient with attachments workflow example

Send a report to multiple recipients with CC, BCC, and a PDF attachment.

```yaml
- name: Generate report
  id: report
  uses: w3-io/w3-actions/encode@v1
  with:
    command: base64-encode
    input: ${{ steps.build-report.outputs.pdf-content }}

- name: Send report email
  id: email
  uses: w3-io/w3-email-action@v1
  with:
    provider: resend
    api-key: ${{ secrets.RESEND_KEY }}
    to: finance@company.com,cfo@company.com
    cc: accounting@company.com
    bcc: compliance@company.com
    from: reports@company.com
    from-name: Automated Reports
    reply-to: finance-team@company.com
    subject: Monthly Financial Report - January 2024
    body-html: |
      <h2>Monthly Report</h2>
      <p>Please find the January 2024 financial report attached.</p>
    body-text: |
      Monthly Report
      Please find the January 2024 financial report attached.
    attachments: |
      [
        {
          "filename": "report-2024-01.pdf",
          "content": "${{ steps.report.outputs.result }}",
          "type": "application/pdf"
        }
      ]

- name: Verify sent
  if: steps.email.outputs.success != 'true'
  run: |
    echo "Email failed with status ${{ steps.email.outputs.status-code }}"
    exit 1
```

## Error handling

The action fails with a descriptive message on:

- Missing or invalid API key
- Missing required inputs (`to`, `from`)
- No body content (none of `body-html`, `body-text`, or `template-id`)
- Provider API errors (invalid sender, unverified domain, etc.)
- Rate limit exceeded
