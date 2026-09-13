const TEXTBEE_BASE_URL = "https://api.textbee.dev/api/v1/gateway";

// Textbee expects E.164. Kiosk phone inputs are PH local format (09XXXXXXXXX).
function normalizePhoneToE164(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("63")) return `+${digits}`;
  if (digits.startsWith("0")) return `+63${digits.slice(1)}`;
  return `+${digits}`;
}

async function sendSms(phone, message) {
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  const apiKey = process.env.TEXTBEE_API_KEY;

  if (!deviceId || !apiKey) {
    return { ok: false, error: "Textbee credentials are not configured" };
  }

  try {
    const res = await fetch(`${TEXTBEE_BASE_URL}/devices/${deviceId}/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        recipients: [normalizePhoneToE164(phone)],
        message,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Textbee responded ${res.status}: ${text}` };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendSms, normalizePhoneToE164 };
