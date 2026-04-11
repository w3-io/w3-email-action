# W3 Email Action

Send email from W3 workflows. One interface for SendGrid and Resend, with support for templates, CC/BCC, and attachments.

## Quick Start

```yaml
- uses: w3-io/w3-email-action@v1
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

This action sends email -- there is no `command` input. Configure the operation through the inputs below.

## Inputs

| Name            | Required | Default    | Description                                                                                            |
| --------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `provider`      | Yes      | `sendgrid` | Email provider: `sendgrid` or `resend`                                                                 |
| `api-key`       | Yes      |            | Provider API key                                                                                       |
| `to`            | Yes      |            | Recipient email (comma-separated for multiple)                                                         |
| `from`          | Yes      |            | Sender email address                                                                                   |
| `from-name`     | No       |            | Sender display name                                                                                    |
| `subject`       | No       |            | Subject line (not required when using `template-id`)                                                   |
| `body-html`     | No       |            | HTML email body                                                                                        |
| `body-text`     | No       |            | Plain text email body (fallback)                                                                       |
| `cc`            | No       |            | CC recipients (comma-separated)                                                                        |
| `bcc`           | No       |            | BCC recipients (comma-separated)                                                                       |
| `reply-to`      | No       |            | Reply-to email address                                                                                 |
| `template-id`   | No       |            | Provider-side template ID (replaces body-html/body-text)                                               |
| `template-data` | No       |            | JSON object of dynamic data for the template                                                           |
| `attachments`   | No       |            | JSON array of attachments: `[{"filename": "f.pdf", "content": "<base64>", "type": "application/pdf"}]` |

At least one of `body-html`, `body-text`, or `template-id` is required.

## Outputs

| Name          | Description                            |
| ------------- | -------------------------------------- |
| `success`     | `true` if provider accepted the email  |
| `status-code` | HTTP status code from the provider API |
| `result`      | Full JSON result                       |

## Authentication

### SendGrid

Sign up at https://sendgrid.com. Free tier: 100 emails/day.

```yaml
provider: sendgrid
api-key: SG.xxxxx
```

### Resend

Sign up at https://resend.com. Free tier: 100 emails/day, 1 domain.

```yaml
provider: resend
api-key: re_xxxxx
```
