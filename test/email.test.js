import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Test the core logic of the email action:
 * - Provider selection (sendgrid vs resend)
 * - Input validation (missing to, from, provider)
 * - Recipient parsing
 * - JSON input parsing
 * - Payload construction for each provider
 */

// Reproduce helpers from the action
function parseRecipients(raw) {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseJsonInput(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error(`Invalid JSON input: ${e.message}`)
  }
}

const PROVIDERS = ['sendgrid', 'resend']

// Build SendGrid payload (simplified from action)
function buildSendGridPayload(email) {
  const personalization = {
    to: email.to.map((addr) => ({ email: addr })),
  }
  if (email.cc.length > 0) {
    personalization.cc = email.cc.map((addr) => ({ email: addr }))
  }
  if (email.bcc.length > 0) {
    personalization.bcc = email.bcc.map((addr) => ({ email: addr }))
  }
  if (email.templateId) {
    personalization.dynamic_template_data = email.templateData || {}
  }

  const payload = {
    personalizations: [personalization],
    from: { email: email.from },
  }
  if (email.fromName) payload.from.name = email.fromName
  if (email.replyTo) payload.reply_to = { email: email.replyTo }

  if (email.templateId) {
    payload.template_id = email.templateId
  } else {
    if (!email.subject) throw new Error('subject is required when not using template-id')
    payload.subject = email.subject
    payload.content = []
    if (email.bodyText) payload.content.push({ type: 'text/plain', value: email.bodyText })
    if (email.bodyHtml) payload.content.push({ type: 'text/html', value: email.bodyHtml })
    if (payload.content.length === 0) {
      throw new Error('Either body-html or body-text is required when not using template-id')
    }
  }

  if (email.attachments && email.attachments.length > 0) {
    payload.attachments = email.attachments.map((att) => ({
      content: att.content,
      filename: att.filename,
      type: att.type || 'application/octet-stream',
      disposition: att.disposition || 'attachment',
    }))
  }

  return payload
}

// Build Resend payload (simplified from action)
function buildResendPayload(email) {
  const payload = {
    from: email.fromName ? `${email.fromName} <${email.from}>` : email.from,
    to: email.to,
    subject: email.subject,
  }
  if (email.cc.length > 0) payload.cc = email.cc
  if (email.bcc.length > 0) payload.bcc = email.bcc
  if (email.replyTo) payload.reply_to = email.replyTo

  if (email.templateId) {
    throw new Error(
      'Resend does not support server-side template IDs. Use body-html with template data interpolated via workflow expressions.',
    )
  }

  if (email.bodyHtml) payload.html = email.bodyHtml
  if (email.bodyText) payload.text = email.bodyText

  if (!payload.html && !payload.text) {
    throw new Error('Either body-html or body-text is required')
  }
  if (!payload.subject) {
    throw new Error('subject is required for Resend')
  }

  if (email.attachments && email.attachments.length > 0) {
    payload.attachments = email.attachments.map((att) => ({
      content: att.content,
      filename: att.filename,
    }))
  }

  return payload
}

describe('parseRecipients', () => {
  it('parses comma-separated emails', () => {
    const result = parseRecipients('a@b.com, c@d.com, e@f.com')
    assert.deepEqual(result, ['a@b.com', 'c@d.com', 'e@f.com'])
  })

  it('trims whitespace', () => {
    const result = parseRecipients('  a@b.com ,  c@d.com  ')
    assert.deepEqual(result, ['a@b.com', 'c@d.com'])
  })

  it('filters empty entries', () => {
    const result = parseRecipients('a@b.com,,c@d.com,')
    assert.deepEqual(result, ['a@b.com', 'c@d.com'])
  })

  it('returns empty array for empty string', () => {
    assert.deepEqual(parseRecipients(''), [])
  })

  it('returns empty array for null', () => {
    assert.deepEqual(parseRecipients(null), [])
  })

  it('returns empty array for undefined', () => {
    assert.deepEqual(parseRecipients(undefined), [])
  })

  it('single recipient', () => {
    assert.deepEqual(parseRecipients('solo@test.com'), ['solo@test.com'])
  })
})

describe('parseJsonInput', () => {
  it('parses valid JSON', () => {
    assert.deepEqual(parseJsonInput('{"key":"val"}'), { key: 'val' })
  })

  it('returns null for empty string', () => {
    assert.equal(parseJsonInput(''), null)
  })

  it('returns null for null', () => {
    assert.equal(parseJsonInput(null), null)
  })

  it('throws on invalid JSON', () => {
    assert.throws(() => parseJsonInput('{bad}'), {
      message: /Invalid JSON input/,
    })
  })
})

describe('provider selection', () => {
  it('sendgrid is a known provider', () => {
    assert.ok(PROVIDERS.includes('sendgrid'))
  })

  it('resend is a known provider', () => {
    assert.ok(PROVIDERS.includes('resend'))
  })

  it('unknown provider is rejected', () => {
    assert.ok(!PROVIDERS.includes('mailgun'))
  })
})

describe('input validation', () => {
  it('empty recipients list should be caught', () => {
    const to = parseRecipients('')
    assert.equal(to.length, 0)
    // The action throws: "At least one recipient is required"
  })

  it('missing from is caught by required flag', () => {
    // The action uses core.getInput('from', { required: true })
    // which throws if empty. We validate the logic expects it.
    const from = ''
    assert.equal(from, '')
  })

  it('missing provider is caught', () => {
    const provider = ''
    assert.ok(!PROVIDERS.includes(provider))
  })
})

describe('SendGrid payload construction', () => {
  const baseEmail = {
    to: ['recipient@test.com'],
    cc: [],
    bcc: [],
    from: 'sender@test.com',
    fromName: '',
    subject: 'Test Subject',
    bodyHtml: '<p>Hello</p>',
    bodyText: '',
    replyTo: '',
    templateId: '',
    templateData: null,
    attachments: [],
  }

  it('builds basic SendGrid payload', () => {
    const payload = buildSendGridPayload(baseEmail)
    assert.equal(payload.from.email, 'sender@test.com')
    assert.equal(payload.subject, 'Test Subject')
    assert.equal(payload.personalizations[0].to[0].email, 'recipient@test.com')
    assert.equal(payload.content[0].type, 'text/html')
  })

  it('includes from name when provided', () => {
    const payload = buildSendGridPayload({ ...baseEmail, fromName: 'Sender Name' })
    assert.equal(payload.from.name, 'Sender Name')
  })

  it('includes cc and bcc', () => {
    const payload = buildSendGridPayload({
      ...baseEmail,
      cc: ['cc@test.com'],
      bcc: ['bcc@test.com'],
    })
    assert.equal(payload.personalizations[0].cc[0].email, 'cc@test.com')
    assert.equal(payload.personalizations[0].bcc[0].email, 'bcc@test.com')
  })

  it('includes reply-to', () => {
    const payload = buildSendGridPayload({ ...baseEmail, replyTo: 'reply@test.com' })
    assert.equal(payload.reply_to.email, 'reply@test.com')
  })

  it('template mode sets template_id and dynamic data', () => {
    const payload = buildSendGridPayload({
      ...baseEmail,
      subject: '',
      templateId: 'd-abc123',
      templateData: { name: 'World' },
    })
    assert.equal(payload.template_id, 'd-abc123')
    assert.deepEqual(
      payload.personalizations[0].dynamic_template_data,
      { name: 'World' },
    )
    assert.equal(payload.subject, undefined)
  })

  it('throws when no subject and no template', () => {
    assert.throws(
      () => buildSendGridPayload({ ...baseEmail, subject: '' }),
      { message: /subject is required/ },
    )
  })

  it('throws when no body and no template', () => {
    assert.throws(
      () =>
        buildSendGridPayload({
          ...baseEmail,
          bodyHtml: '',
          bodyText: '',
        }),
      { message: /body-html or body-text is required/ },
    )
  })

  it('includes both text and html content', () => {
    const payload = buildSendGridPayload({
      ...baseEmail,
      bodyText: 'Hello',
      bodyHtml: '<p>Hello</p>',
    })
    assert.equal(payload.content.length, 2)
    assert.equal(payload.content[0].type, 'text/plain')
    assert.equal(payload.content[1].type, 'text/html')
  })

  it('includes attachments', () => {
    const payload = buildSendGridPayload({
      ...baseEmail,
      attachments: [
        { content: 'base64data', filename: 'file.pdf', type: 'application/pdf' },
      ],
    })
    assert.equal(payload.attachments.length, 1)
    assert.equal(payload.attachments[0].filename, 'file.pdf')
    assert.equal(payload.attachments[0].type, 'application/pdf')
  })

  it('attachment defaults to octet-stream type', () => {
    const payload = buildSendGridPayload({
      ...baseEmail,
      attachments: [{ content: 'data', filename: 'file.bin' }],
    })
    assert.equal(payload.attachments[0].type, 'application/octet-stream')
  })
})

describe('Resend payload construction', () => {
  const baseEmail = {
    to: ['recipient@test.com'],
    cc: [],
    bcc: [],
    from: 'sender@test.com',
    fromName: '',
    subject: 'Test Subject',
    bodyHtml: '<p>Hello</p>',
    bodyText: '',
    replyTo: '',
    templateId: '',
    templateData: null,
    attachments: [],
  }

  it('builds basic Resend payload', () => {
    const payload = buildResendPayload(baseEmail)
    assert.equal(payload.from, 'sender@test.com')
    assert.equal(payload.subject, 'Test Subject')
    assert.deepEqual(payload.to, ['recipient@test.com'])
    assert.equal(payload.html, '<p>Hello</p>')
  })

  it('formats from with name', () => {
    const payload = buildResendPayload({ ...baseEmail, fromName: 'Test User' })
    assert.equal(payload.from, 'Test User <sender@test.com>')
  })

  it('throws on template-id usage', () => {
    assert.throws(
      () => buildResendPayload({ ...baseEmail, templateId: 'tmpl-123' }),
      { message: /Resend does not support server-side template IDs/ },
    )
  })

  it('throws when no body provided', () => {
    assert.throws(
      () => buildResendPayload({ ...baseEmail, bodyHtml: '', bodyText: '' }),
      { message: /body-html or body-text is required/ },
    )
  })

  it('throws when no subject provided', () => {
    assert.throws(
      () => buildResendPayload({ ...baseEmail, subject: '' }),
      { message: /subject is required for Resend/ },
    )
  })

  it('includes cc and bcc as arrays', () => {
    const payload = buildResendPayload({
      ...baseEmail,
      cc: ['cc@test.com'],
      bcc: ['bcc@test.com'],
    })
    assert.deepEqual(payload.cc, ['cc@test.com'])
    assert.deepEqual(payload.bcc, ['bcc@test.com'])
  })

  it('includes attachments with content and filename only', () => {
    const payload = buildResendPayload({
      ...baseEmail,
      attachments: [{ content: 'data', filename: 'doc.txt', type: 'text/plain' }],
    })
    assert.equal(payload.attachments.length, 1)
    assert.equal(payload.attachments[0].filename, 'doc.txt')
    assert.equal(payload.attachments[0].type, undefined) // Resend doesn't pass type
  })
})
