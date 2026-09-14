const { sendSms } = require("./semaphore");

function getFrontendBaseUrl() {
  // Links in email/SMS are opened on the passenger's own phone, so prefer an
  // explicitly configured public URL, then any non-localhost CORS origin
  // (e.g. the kiosk PC's LAN IP), and only fall back to localhost last.
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const origins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const preferred = origins.find((o) => !/localhost|127\.0\.0\.1/.test(o)) || origins[0];
  return preferred.replace(/\/$/, "");
}

function routeLabel(route) {
  return route === "SURIGAO_TO_DAPA" ? "Surigao → Dapa" : "Dapa → Surigao";
}

function buildReprintLink(referenceCode) {
  return `${getFrontendBaseUrl()}/?ref=${encodeURIComponent(referenceCode)}`;
}

function buildMessage({ fullName, referenceCode, ship, schedule }) {
  const link = buildReprintLink(referenceCode);
  return (
    `PORTGO: Hi ${fullName}, your registration is confirmed! ` +
    `Ref: ${referenceCode}. Vessel: ${ship.name}, ${routeLabel(schedule.route)}, Departs ${schedule.departureTime}. ` +
    `View/reprint your QR pass: ${link}`
  );
}

async function sendRegistrationSms({ contactNumber, fullName, referenceCode, ship, schedule }) {
  if (!contactNumber) {
    return { sent: false, reason: "No phone number provided" };
  }

  const message = buildMessage({ fullName, referenceCode, ship, schedule });
  const link = buildReprintLink(referenceCode);
  const result = await sendSms(contactNumber, message);

  if (result.ok) {
    return { sent: true, to: contactNumber, message, link, sentAt: new Date().toISOString() };
  }
  return { sent: false, to: contactNumber, message, link, reason: result.error };
}

module.exports = { sendRegistrationSms, buildReprintLink };
