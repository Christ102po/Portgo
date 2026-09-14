const nodemailer = require("nodemailer");

/*
 * PORTGO email delivery
 * ---------------------
 * Provider priority when EMAIL_PROVIDER=auto (default):
 *   1) Gmail API over HTTPS  -> works on Railway Free/Trial/Hobby/Pro
 *   2) Resend HTTPS API      -> works on Railway Free/Trial/Hobby/Pro
 *   3) SMTP / Nodemailer     -> Railway Pro+ only (Railway blocks SMTP below Pro)
 *
 * You can force one provider with:
 *   EMAIL_PROVIDER=gmail_api | resend | smtp | auto
 *
 * Never put any of these credentials in frontend/.env or source control.
 */

let cachedTransport;
let transportLabel = "unconfigured";

function normalizeProvider(value) {
  const provider = String(value || "auto").trim().toLowerCase();
  return ["auto", "gmail_api", "resend", "smtp"].includes(provider) ? provider : "auto";
}

function gmailApiConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN
  );
}

function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function selectedProvider() {
  const requested = normalizeProvider(process.env.EMAIL_PROVIDER);

  if (requested === "gmail_api") return gmailApiConfigured() ? "gmail_api" : null;
  if (requested === "resend") return resendConfigured() ? "resend" : null;
  if (requested === "smtp") return smtpConfigured() ? "smtp" : null;

  if (gmailApiConfigured()) return "gmail_api";
  if (resendConfigured()) return "resend";
  if (smtpConfigured()) return "smtp";
  return null;
}

function getTransport() {
  if (cachedTransport !== undefined) return cachedTransport;

  if (!smtpConfigured()) {
    cachedTransport = null;
    return null;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE
    ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
    : port === 465;

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  transportLabel = `${host}:${port}`;
  return cachedTransport;
}

function mailFrom() {
  return (
    process.env.MAIL_FROM ||
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    "no-reply@portgo.local"
  );
}

function isEmailConfigured() {
  return selectedProvider() !== null;
}

async function getGmailAccessToken() {
  const body = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const details = data.error_description || data.error || `HTTP ${response.status}`;
    throw new Error(`Gmail OAuth token refresh failed: ${details}`);
  }

  return data.access_token;
}

function encodeHeaderValue(value) {
  const str = String(value || "");
  if (/^[\x20-\x7E]*$/.test(str)) return str;
  return `=?UTF-8?B?${Buffer.from(str, "utf8").toString("base64")}?=`;
}

function createGmailRawMessage({ to, subject, text, html }) {
  const boundary = `portgo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const from = mailFrom();
  const safeText = String(text || "");
  const safeHtml = String(html || "");

  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeaderValue(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    safeText,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    safeHtml || safeText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>"),
    "",
    `--${boundary}--`,
    "",
  ];

  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}

async function sendViaGmailApi({ to, subject, text, html }) {
  const accessToken = await getGmailAccessToken();
  const raw = createGmailRawMessage({ to, subject, text, html });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gmail API send failed: ${apiMessage}`);
  }

  return { ok: true, messageId: data.id || null, provider: "Gmail API" };
}

async function sendViaResend({ to, subject, text, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom(),
      to: [to],
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = data?.message || data?.error || `HTTP ${response.status}`;
    throw new Error(`Resend API send failed: ${apiMessage}`);
  }

  return { ok: true, messageId: data.id || null, provider: "Resend HTTPS API" };
}

async function sendViaSmtp({ to, subject, text, html }) {
  const transport = getTransport();
  if (!transport) throw new Error("SMTP is not configured");

  const info = await transport.sendMail({ from: mailFrom(), to, subject, text, html });
  return { ok: true, messageId: info.messageId || null, provider: `SMTP ${transportLabel}` };
}

async function sendMail({ to, subject, text, html }) {
  if (!to) return { ok: false, error: "No recipient email address" };

  const provider = selectedProvider();
  if (!provider) {
    console.log(`[MAIL][DISABLED] to=${to} subject="${subject}" — no email provider configured`);
    return { ok: false, simulated: true, error: "No email provider configured" };
  }

  try {
    let result;
    if (provider === "gmail_api") {
      result = await sendViaGmailApi({ to, subject, text, html });
    } else if (provider === "resend") {
      result = await sendViaResend({ to, subject, text, html });
    } else {
      result = await sendViaSmtp({ to, subject, text, html });
    }

    console.log(
      `[MAIL] sent to ${to} via ${result.provider}${result.messageId ? ` (${result.messageId})` : ""}`
    );
    return result;
  } catch (err) {
    console.error(`[MAIL][FAILED] provider=${provider} to=${to}: ${err.message}`);
    return { ok: false, provider, error: err.message };
  }
}

// Startup check. It never sends a message.
async function verifyMailer() {
  const provider = selectedProvider();

  if (!provider) {
    console.log(
      "[MAIL] Email OTP is not configured. Configure Gmail API or Resend; SMTP is also supported on Railway Pro+."
    );
    return false;
  }

  if (provider === "gmail_api") {
    try {
      await getGmailAccessToken();
      console.log(`[MAIL] Gmail API ready over HTTPS${process.env.GMAIL_USER ? ` for ${process.env.GMAIL_USER}` : ""}`);
      return true;
    } catch (err) {
      console.error(`[MAIL] Gmail API check failed: ${err.message}`);
      return false;
    }
  }

  if (provider === "resend") {
    console.log(`[MAIL] Resend HTTPS API configured. Sender: ${mailFrom()}`);
    return true;
  }

  const transport = getTransport();
  try {
    await transport.verify();
    console.log(`[MAIL] SMTP ready via ${transportLabel}`);
    return true;
  } catch (err) {
    console.error(`[MAIL] SMTP verify failed (${transportLabel}): ${err.message}`);
    return false;
  }
}

module.exports = {
  sendMail,
  isEmailConfigured,
  verifyMailer,
  selectedProvider,
};
