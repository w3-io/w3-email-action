const core = require("@actions/core");

// --- Provider implementations ---

async function sendViaSendGrid(apiKey, email) {
  const payload = {
    personalizations: [
      {
        to: email.to.map((addr) => ({ email: addr })),
      },
    ],
    from: { email: email.from },
    subject: email.subject,
    content: [],
  };

  if (email.fromName) {
    payload.from.name = email.fromName;
  }

  if (email.replyTo) {
    payload.reply_to = { email: email.replyTo };
  }

  if (email.bodyText) {
    payload.content.push({ type: "text/plain", value: email.bodyText });
  }
  if (email.bodyHtml) {
    payload.content.push({ type: "text/html", value: email.bodyHtml });
  }

  // Must have at least one content entry
  if (payload.content.length === 0) {
    throw new Error("Either body-html or body-text is required");
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

async function sendViaResend(apiKey, email) {
  const payload = {
    from: email.fromName
      ? `${email.fromName} <${email.from}>`
      : email.from,
    to: email.to,
    subject: email.subject,
  };

  if (email.bodyHtml) payload.html = email.bodyHtml;
  if (email.bodyText) payload.text = email.bodyText;
  if (email.replyTo) payload.reply_to = email.replyTo;

  if (!payload.html && !payload.text) {
    throw new Error("Either body-html or body-text is required");
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
    const toRaw = core.getInput("to", { required: true });
    const from = core.getInput("from", { required: true });
    const fromName = core.getInput("from-name") || "";
    const subject = core.getInput("subject", { required: true });
    const bodyHtml = core.getInput("body-html") || "";
    const bodyText = core.getInput("body-text") || "";
    const replyTo = core.getInput("reply-to") || "";

    const to = toRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (to.length === 0) {
      throw new Error("At least one recipient is required");
    }

    const sendFn = PROVIDERS[provider];
    if (!sendFn) {
      throw new Error(
        `Unknown provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(", ")}`,
      );
    }

    const email = { to, from, fromName, subject, bodyHtml, bodyText, replyTo };
    const result = await sendFn(apiKey, email);

    core.setOutput("success", String(result.success));
    core.setOutput("status-code", String(result.statusCode));
    core.setOutput("result", JSON.stringify(result));

    if (result.success) {
      core.info(`Email sent via ${provider} (${result.statusCode})`);
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
