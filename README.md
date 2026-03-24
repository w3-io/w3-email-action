# W3 Email Action

Send email from W3 workflows. One interface, multiple providers.

## Usage

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

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `provider` | yes | `sendgrid` | `sendgrid` or `resend` |
| `api-key` | yes | | Provider API key |
| `to` | yes | | Recipient (comma-separated for multiple) |
| `from` | yes | | Sender email |
| `from-name` | no | | Sender display name |
| `subject` | yes | | Subject line |
| `body-html` | no | | HTML body |
| `body-text` | no | | Plain text body |
| `reply-to` | no | | Reply-to address |

At least one of `body-html` or `body-text` is required.

## Outputs

| Output | Description |
|--------|-------------|
| `success` | `true` if provider accepted the email |
| `status-code` | HTTP status from provider API |
| `result` | Full JSON result |

## Providers

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

## Examples

### Send with both HTML and text fallback

```yaml
- uses: w3-io/w3-email-action@v1
  with:
    provider: sendgrid
    api-key: ${{ secrets.SENDGRID_KEY }}
    to: user@example.com
    from: team@yourapp.com
    subject: Weekly report
    body-html: <h1>Report</h1><p>Everything looks good.</p>
    body-text: "Report: Everything looks good."
```

### Multiple recipients

```yaml
- uses: w3-io/w3-email-action@v1
  with:
    provider: resend
    api-key: ${{ secrets.RESEND_KEY }}
    to: alice@example.com, bob@example.com
    from: alerts@yourapp.com
    subject: System alert
    body-text: Disk usage exceeded 90%
```

### Conditional email after compliance check

```yaml
- uses: w3-io/w3-chainalysis-action@v1
  id: screen
  with:
    address: ${{ inputs.wallet }}
    api-key: ${{ secrets.CHAINALYSIS_KEY }}

- if: steps.screen.outputs.is-sanctioned == 'true'
  uses: w3-io/w3-email-action@v1
  with:
    provider: sendgrid
    api-key: ${{ secrets.SENDGRID_KEY }}
    to: compliance@yourcompany.com
    from: alerts@yourcompany.com
    subject: "Sanctioned address detected: ${{ inputs.wallet }}"
    body-html: "<p>Address ${{ inputs.wallet }} is on the OFAC sanctions list.</p>"
```

## Roadmap

- [ ] AWS SES provider
- [ ] Mailgun provider
- [ ] Attachments support
- [ ] Template ID support (provider-specific templates)
