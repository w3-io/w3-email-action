# E2E Test Results

> Last verified: 2026-04-15 -- PASS (2/2)

## Prerequisites

| Credential | Env var | Source |
|-----------|---------|--------|
| SendGrid API key | `EMAIL_API_KEY` | SendGrid dashboard |
| Verified sender address | `EMAIL_FROM` | SendGrid verified sender |
| Recipient address | `EMAIL_TO` | Any valid email address |

## Results

| # | Step | Command | Status | Notes |
|---|------|---------|--------|-------|
| 1 | Send a plain text email via SendGrid | `send` | PASS | |
| 2 | Send an HTML email | `send` | PASS | |

**Summary: 2/2 pass.**

## Skipped Commands

| Command | Reason |
|---------|--------|
| N/A | All commands exercised |

## How to run

```bash
# Export credentials
export EMAIL_API_KEY="sk_test_your-key-here"
export EMAIL_FROM="verified-sender@yourdomain.com"
export EMAIL_TO="recipient@example.com"

# Run
w3 workflow test --execute test/workflows/e2e.yaml
```
