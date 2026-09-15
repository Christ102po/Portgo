const nodemailer = require("nodemailer");

// SMTP config comes from env (see backend/.env). This is the Node equivalent of
// "PHPMailer + SMTP": point it at any SMTP server (Gmail, Brevo, Mailtrap, your
// own mail host) and it sends for real. If nothing is configured the app keeps
// working — email sends are just logged and reported as "simulated".
let cachedTransport;
let transportLabel = "unconfigured";

function getTransport() {
  if (cachedTransport !== undefined) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    cachedTransport = null;
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
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

function isEmailConfigured() {
  return getTransport() !== null;
}

function mailFrom() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@portgo.local";
}

async function sendMail({ to, subject, text, html }) {
  if (!to) return { ok: false, error: "No recipient email address" };

  const transport = getTransport();
  if (!transport) {
    console.log(`[MAIL][SIMULATED] to=${to} subject="${subject}" — SMTP not configured`);
    return { ok: false, simulated: true, error: "No email provider configured" };
  }

  try {
    const info = await transport.sendMail({ from: mailFrom(), to, subject, text, html });
    console.log(`[MAIL] sent to ${to} via ${transportLabel} (${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[MAIL][FAILED] to=${to}: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// Optional startup check — logs whether live email is available.
async function verifyMailer() {
  const transport = getTransport();
  if (!transport) {
    console.log("[MAIL] No SMTP configured — email notifications run in simulated mode.");
    return false;
  }
  try {
    await transport.verify();
    console.log(`[MAIL] SMTP ready via ${transportLabel}`);
    return true;
  } catch (err) {
    console.error(`[MAIL] SMTP verify failed (${transportLabel}): ${err.message}`);
    return false;
  }
}

module.exports = { sendMail, isEmailConfigured, verifyMailer };
