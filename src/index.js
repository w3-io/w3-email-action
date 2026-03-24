const core = require("@actions/core");

// --- Helpers ---

function parseRecipients(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseJsonInput(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON input: ${e.message}`);
  }
}

// --- SendGrid ---

async function sendViaSendGrid(apiKey, email) {
  const personalization = {
    to: email.to.map((addr) => ({ email: addr })),
  };

  if (email.cc.length > 0) {
    personalization.cc = email.cc.map((addr) => ({ email: addr }));
  }
  if (email.bcc.length > 0) {
    personalization.bcc = email.bcc.map((addr) => ({ email: addr }));
  }

  // Template mode: dynamic data goes in personalization
  if (email.templateId) {
    personalization.dynamic_template_data = email.templateData || {};
  }

  const payload = {
    personalizations: [personalization],
    from: { email: email.from },
  };

  if (email.fromName) {
    payload.from.name = email.fromName;
  }

  if (email.replyTo) {
    payload.reply_to = { email: email.replyTo };
  }

  if (email.templateId) {
    // Template mode — SendGrid handles subject and body
    payload.template_id = email.templateId;
  } else {
    // Direct mode — we provide subject and content
    if (!email.subject) {
      throw new Error("subject is required when not using template-id");
    }
    payload.subject = email.subject;
    payload.content = [];
    if (email.bodyText) {
      payload.content.push({ type: "text/plain", value: email.bodyText });
    }
    if (email.bodyHtml) {
      payload.content.push({ type: "text/html", value: email.bodyHtml });
    }
    if (payload.content.length === 0) {
      throw new Error("Either body-html or body-text is required when not using template-id");
    }
  }

  // Attachments
  if (email.attachments && email.attachments.length > 0) {
    payload.attachments = email.attachments.map((att) => ({
      content: att.content,
      filename: att.filename,
      type: att.type || "application/octet-stream",
      disposition: att.disposition || "attachment",
    }));
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const status = response.status;
  const body = await response.text();

  return {
    success: status >= 200 && status < 300,
    statusCode: status,
    detail: body || "accepted",
  };
}

// --- Resend ---

async function sendViaResend(apiKey, email) {
  const payload = {
    from: email.fromName
      ? `${email.fromName} <${email.from}>`
      : email.from,
    to: email.to,
    subject: email.subject,
  };

  if (email.cc.length > 0) payload.cc = email.cc;
  if (email.bcc.length > 0) payload.bcc = email.bcc;
  if (email.replyTo) payload.reply_to = email.replyTo;

  if (email.templateId) {
    // Resend doesn't have server-side templates in the same way.
    // Use react-email or HTML directly. Template-id is not supported.
    throw new Error(
      "Resend does not support server-side template IDs. Use body-html with template data interpolated via workflow expressions.",
    );
  }

  if (email.bodyHtml) payload.html = email.bodyHtml;
  if (email.bodyText) payload.text = email.bodyText;

  if (!payload.html && !payload.text) {
    throw new Error("Either body-html or body-text is required");
  }

  if (!payload.subject) {
    throw new Error("subject is required for Resend");
  }

  // Attachments
  if (email.attachments && email.attachments.length > 0) {
    payload.attachments = email.attachments.map((att) => ({
      content: att.content,
      filename: att.filename,
    }));
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const status = response.status;
  const body = await response.text();

  return {
    success: status >= 200 && status < 300,
    statusCode: status,
    detail: body,
  };
}

const PROVIDERS = {
  sendgrid: sendViaSendGrid,
  resend: sendViaResend,
};

// --- Main ---

async function run() {
  try {
    const provider = core.getInput("provider").toLowerCase();
    const apiKey = core.getInput("api-key", { required: true });
    const to = parseRecipients(core.getInput("to", { required: true }));
    const cc = parseRecipients(core.getInput("cc"));
    const bcc = parseRecipients(core.getInput("bcc"));
    const from = core.getInput("from", { required: true });
    const fromName = core.getInput("from-name") || "";
    const subject = core.getInput("subject") || "";
    const bodyHtml = core.getInput("body-html") || "";
    const bodyText = core.getInput("body-text") || "";
    const replyTo = core.getInput("reply-to") || "";
    const templateId = core.getInput("template-id") || "";
    const templateData = parseJsonInput(core.getInput("template-data") || "");
    const attachments = parseJsonInput(core.getInput("attachments") || "") || [];

    if (to.length === 0) {
      throw new Error("At least one recipient is required");
    }

    const sendFn = PROVIDERS[provider];
    if (!sendFn) {
      throw new Error(
        `Unknown provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(", ")}`,
      );
    }

    const email = {
      to,
      cc,
      bcc,
      from,
      fromName,
      subject,
      bodyHtml,
      bodyText,
      replyTo,
      templateId,
      templateData,
      attachments,
    };

    const result = await sendFn(apiKey, email);

    core.setOutput("success", String(result.success));
    core.setOutput("status-code", String(result.statusCode));
    core.setOutput("result", JSON.stringify(result));

    if (result.success) {
      core.info(
        `Email sent via ${provider} to ${to.join(", ")} (${result.statusCode})`,
      );
    } else {
      core.setFailed(
        `Email failed via ${provider}: ${result.statusCode} ${result.detail}`,
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
