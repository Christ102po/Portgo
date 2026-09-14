const { sendMail } = require("./mailer");
const { buildReprintLink } = require("./registrationSms");

function routeLabel(route) {
  return route === "SURIGAO_TO_DAPA" ? "Surigao → Dapa" : "Dapa → Surigao";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function buildText({ fullName, referenceCode, ship, schedule, link }) {
  return [
    `Hi ${fullName},`,
    "",
    "Your PORTGO registration is confirmed. Please present the QR pass below at the boarding gate.",
    "",
    `Reference No.: ${referenceCode}`,
    `Vessel:        ${ship.name}`,
    `Route:         ${routeLabel(schedule.route)}`,
    `Departure:     ${schedule.departureTime}`,
    "",
    `View / reprint your digital pass: ${link}`,
    "",
    "Please arrive at least 1 hour before departure. Keep this email for your records.",
    "",
    "— Port Operations, PORTGO Terminal",
  ].join("\n");
}

function buildHtml({ fullName, referenceCode, ship, schedule, link }) {
  const name = escapeHtml(fullName);
  const ref = escapeHtml(referenceCode);
  const vessel = escapeHtml(ship.name);
  const route = escapeHtml(routeLabel(schedule.route));
  const departure = escapeHtml(schedule.departureTime);
  const safeLink = escapeHtml(link);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;padding:24px 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:92%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#0f766e;padding:20px 28px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.85;">PORTGO Terminal</div>
                <div style="font-size:20px;font-weight:700;margin-top:2px;">Boarding Pass Confirmed</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;">
                <p style="margin:0 0 16px;font-size:15px;">Hi <strong>${name}</strong>, your registration is confirmed. Present your QR pass at the boarding gate.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr><td style="padding:6px 0;color:#64748b;">Reference No.</td><td style="padding:6px 0;text-align:right;font-weight:700;letter-spacing:1px;">${ref}</td></tr>
                  <tr><td style="padding:6px 0;color:#64748b;">Vessel</td><td style="padding:6px 0;text-align:right;font-weight:600;">${vessel}</td></tr>
                  <tr><td style="padding:6px 0;color:#64748b;">Route</td><td style="padding:6px 0;text-align:right;font-weight:600;">${route}</td></tr>
                  <tr><td style="padding:6px 0;color:#64748b;">Departure</td><td style="padding:6px 0;text-align:right;font-weight:600;">${departure}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px;">
                <a href="${safeLink}" style="display:block;background:#0f766e;color:#ffffff;text-decoration:none;text-align:center;padding:12px 16px;border-radius:10px;font-weight:600;font-size:14px;">View / Reprint Digital Pass</a>
                <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">Please arrive at least 1 hour before departure. If the button doesn't work, copy this link:<br>${safeLink}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">This is an automated message from the PORTGO Terminal system.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendRegistrationEmail({ email, fullName, referenceCode, ship, schedule }) {
  if (!email) return { sent: false, reason: "No email address provided" };

  const link = buildReprintLink(referenceCode);
  const subject = `PORTGO Boarding Pass — ${referenceCode}`;
  const payload = { fullName, referenceCode, ship, schedule, link };

  const result = await sendMail({
    to: email,
    subject,
    text: buildText(payload),
    html: buildHtml(payload),
  });

  if (result.ok) {
    return { sent: true, to: email, subject, link, messageId: result.messageId, sentAt: new Date().toISOString() };
  }
  return {
    sent: false,
    to: email,
    subject,
    link,
    simulated: !!result.simulated,
    reason: result.simulated ? "email provider not configured" : result.error,
  };
}

module.exports = { sendRegistrationEmail };
