const nodemailer = require("nodemailer");

// PORTGO email delivery supports two providers:
//   EMAIL_PROVIDER=gmail  -> Gmail API using OAuth2 refresh-token credentials
//   EMAIL_PROVIDER=smtp   -> classic SMTP using SMTP_* variables
//
// Gmail API is preferred on Railway because it uses HTTPS (port 443) rather
// than SMTP ports. No Google SDK package is required; this module talks to the
// OAuth token endpoint and Gmail REST API directly with Node's built-in fetch.

let cachedSmtpTransport;
let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function clean(value) {
  return String(value || "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

function provider() {
  const configured = clean(process.env.EMAIL_PROVIDER).toLowerCase();
  if (configured) return configured;

  // Auto-detect Gmail API when the OAuth variables are present. This keeps
  // existing Railway environments working even if EMAIL_PROVIDER is omitted.
  if (
    clean(process.env.GMAIL_CLIENT_ID) &&
    clean(process.env.GMAIL_CLIENT_SECRET) &&
    clean(process.env.GMAIL_REFRESH_TOKEN) &&
    clean(process.env.GMAIL_USER)
  ) {
    return "gmail";
  }

  if (
    clean(process.env.SMTP_HOST) &&
    clean(process.env.SMTP_USER) &&
    clean(process.env.SMTP_PASS)
  ) {
    return "smtp";
  }

  return "unconfigured";
}

function gmailConfig() {
  return {
    clientId: clean(process.env.GMAIL_CLIENT_ID),
    clientSecret: clean(process.env.GMAIL_CLIENT_SECRET),
    refreshToken: clean(process.env.GMAIL_REFRESH_TOKEN),
    user: clean(process.env.GMAIL_USER),
    fromName: clean(process.env.MAIL_FROM_NAME) || "PORTGO",
  };
}

function hasGmailConfig() {
  const cfg = gmailConfig();
  return Boolean(cfg.clientId && cfg.clientSecret && cfg.refreshToken && cfg.user);
}

function getSmtpTransport() {
  if (cachedSmtpTransport !== undefined) return cachedSmtpTransport;

  const host = clean(process.env.SMTP_HOST);
  const user = clean(process.env.SMTP_USER);
  const pass = clean(process.env.SMTP_PASS);

  if (!host || !user || !pass) {
    cachedSmtpTransport = null;
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE
    ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
    : port === 465;

  cachedSmtpTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedSmtpTransport;
}

function isEmailConfigured() {
  const mode = provider();
  if (mode === "gmail" || mode === "gmail_api" || mode === "google") {
    return hasGmailConfig();
  }
  if (mode === "smtp") return getSmtpTransport() !== null;
  return false;
}

function sanitizeHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildRawMessage({ fromName, fromEmail, to, subject, text, html }) {
  const safeFromName = sanitizeHeader(fromName || "PORTGO");
  const safeFromEmail = sanitizeHeader(fromEmail);
  const safeTo = sanitizeHeader(to);
  const safeSubject = sanitizeHeader(subject || "PORTGO");
  const boundary = `portgo_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const plain = String(text || "");
  const rich = String(html || `<pre>${plain}</pre>`);

  return [
    `From: ${safeFromName} <${safeFromEmail}>`,
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    plain,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    rich,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function getGmailAccessToken({ forceRefresh = false } = {}) {
  if (
    !forceRefresh &&
    cachedAccessToken &&
    Date.now() < cachedAccessTokenExpiresAt - 60_000
  ) {
    return cachedAccessToken;
  }

  const cfg = gmailConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.refreshToken) {
    throw new Error(
      "Gmail API is missing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN"
    );
  }

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: cfg.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const reason = data.error_description || data.error || `HTTP ${response.status}`;
    throw new Error(`Google OAuth token refresh failed: ${reason}`);
  }

  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

async function sendViaGmailApi({ to, subject, text, html }) {
  const cfg = gmailConfig();
  if (!hasGmailConfig()) {
    return {
      ok: false,
      error:
        "Gmail API is not configured. Check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_USER.",
    };
  }

  const raw = base64UrlEncode(
    buildRawMessage({
      fromName: cfg.fromName,
      fromEmail: cfg.user,
      to,
      subject,
      text,
      html,
    })
  );

  async function doSend(accessToken) {
    return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
  }

  try {
    let accessToken = await getGmailAccessToken();
    let response = await doSend(accessToken);

    // If Google invalidated/expired the cached token between requests, refresh
    // once and retry automatically.
    if (response.status === 401) {
      accessToken = await getGmailAccessToken({ forceRefresh: true });
      response = await doSend(accessToken);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const googleMessage =
        data?.error?.message || data?.error_description || data?.error || `HTTP ${response.status}`;
      throw new Error(`Gmail API send failed: ${googleMessage}`);
    }

    console.log(`[MAIL] sent to ${to} via Gmail API (${data.id || "no-message-id"})`);
    return { ok: true, messageId: data.id || null };
  } catch (err) {
    console.error(`[MAIL][FAILED] Gmail API to=${to}: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function sendViaSmtp({ to, subject, text, html }) {
  const transport = getSmtpTransport();
  if (!transport) {
    return { ok: false, error: "SMTP is not configured" };
  }

  const from = clean(process.env.MAIL_FROM) || clean(process.env.SMTP_USER);
  try {
    const info = await transport.sendMail({ from, to, subject, text, html });
    console.log(`[MAIL] sent to ${to} via SMTP (${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[MAIL][FAILED] SMTP to=${to}: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function sendMail({ to, subject, text, html }) {
  if (!to) return { ok: false, error: "No recipient email address" };

  const mode = provider();
  if (mode === "gmail" || mode === "gmail_api" || mode === "google") {
    return sendViaGmailApi({ to, subject, text, html });
  }

  if (mode === "smtp") {
    return sendViaSmtp({ to, subject, text, html });
  }

  console.error(
    `[MAIL] No supported email provider configured. EMAIL_PROVIDER=${mode || "(empty)"}`
  );
  return {
    ok: false,
    error: "No email provider configured. Set EMAIL_PROVIDER=gmail and the GMAIL_* variables.",
  };
}

async function verifyMailer() {
  const mode = provider();

  if (mode === "gmail" || mode === "gmail_api" || mode === "google") {
    if (!hasGmailConfig()) {
      console.error(
        "[MAIL] Gmail API selected but configuration is incomplete. Required: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER."
      );
      return false;
    }

    try {
      await getGmailAccessToken({ forceRefresh: true });
      console.log(`[MAIL] Gmail API ready for ${gmailConfig().user}`);
      return true;
    } catch (err) {
      console.error(`[MAIL] Gmail API verification failed: ${err.message}`);
      return false;
    }
  }

  if (mode === "smtp") {
    const transport = getSmtpTransport();
    if (!transport) {
      console.error("[MAIL] SMTP selected but SMTP_HOST/SMTP_USER/SMTP_PASS are incomplete.");
      return false;
    }

    try {
      await transport.verify();
      console.log("[MAIL] SMTP ready");
      return true;
    } catch (err) {
      console.error(`[MAIL] SMTP verification failed: ${err.message}`);
      return false;
    }
  }

  console.log("[MAIL] No live email provider configured.");
  return false;
}

module.exports = { sendMail, isEmailConfigured, verifyMailer };
