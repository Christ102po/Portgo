const TEXTBEE_SEND_URL = "https://api.textbee.dev/api/v1/gateway/send-sms";

// TextBee expects E.164. PORTGO accepts PH local format (09XXXXXXXXX),
// so normalize it before sending.
function normalizePhoneToE164(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("63")) return `+${digits}`;
  if (digits.startsWith("0")) return `+63${digits.slice(1)}`;
  return `+${digits}`;
}

async function sendSms(phone, message) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey) {
    return {
      ok: false,
      error: "SMS service is not configured. Set TEXTBEE_API_KEY in the server environment.",
    };
  }

  const payload = {
    recipients: [normalizePhoneToE164(phone)],
    message,
  };

  // TextBee can automatically use the default/most recently active device.
  // Keep this optional so a single-device installation only needs the API key.
  if (deviceId) payload.deviceId = deviceId;

  try {
    const res = await fetch(TEXTBEE_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text().catch(() => "");
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      const providerMessage =
        data?.message || data?.error || data?.data?.message || raw || "Unknown SMS provider error";
      return { ok: false, status: res.status, error: `TextBee ${res.status}: ${providerMessage}` };
    }

    return {
      ok: true,
      data,
      smsBatchId: data?.data?.smsBatchId || null,
    };
  } catch (err) {
    return { ok: false, error: err.message || "Unable to reach the SMS provider" };
  }
}

module.exports = { sendSms, normalizePhoneToE164 };
