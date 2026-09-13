const ONESIGNAL_SMS_URL = "https://api.onesignal.com/notifications?c=sms";

function normalizePhoneE164(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `+63${digits}`;

  // Keep a generic E.164 fallback for already-international values. The
  // request schema still restricts the public PORTGO flow to PH mobile numbers.
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

function getConfig() {
  return {
    appId: String(process.env.ONESIGNAL_APP_ID || "").trim(),
    apiKey: String(process.env.ONESIGNAL_API_KEY || "").trim(),
    smsFrom: String(process.env.ONESIGNAL_SMS_FROM || "").trim(),
  };
}

function safeProviderError(data, raw) {
  if (data && typeof data === "object") {
    if (Array.isArray(data.errors)) return data.errors.join("; ");
    if (data.errors && typeof data.errors === "object") return JSON.stringify(data.errors);
    if (data.error) return String(data.error);
    if (data.message) return String(data.message);
  }
  return raw || "Unknown OneSignal response";
}

async function sendOtpSms(phone, code, minutesValid = 5) {
  const { appId, apiKey, smsFrom } = getConfig();
  const number = normalizePhoneE164(phone);

  if (!appId || !apiKey) {
    return {
      ok: false,
      status: 503,
      error: "OneSignal OTP is not configured. Set ONESIGNAL_APP_ID and ONESIGNAL_API_KEY in Railway.",
    };
  }

  if (!number) {
    return { ok: false, status: 400, error: "Invalid phone number format." };
  }

  const payload = {
    app_id: appId,
    target_channel: "sms",
    include_phone_numbers: [number],
    contents: {
      en: `Your PORTGO verification code is ${String(code)}. It expires in ${minutesValid} minutes. Do not share this code.`,
    },
    name: "PORTGO phone verification",
  };

  // Some OneSignal SMS setups have a default sender configured in the
  // dashboard. Only send sms_from when the account specifically requires it.
  if (smsFrom) payload.sms_from = smsFrom;

  try {
    const response = await fetch(ONESIGNAL_SMS_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text().catch(() => "");
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `OneSignal ${response.status}: ${safeProviderError(data, raw)}`,
        data,
      };
    }

    if (data?.errors?.length) {
      return {
        ok: false,
        status: 502,
        error: `OneSignal rejected the OTP: ${safeProviderError(data, raw)}`,
        data,
      };
    }

    return {
      ok: true,
      status: response.status,
      messageId: data?.id || null,
      number,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: `Unable to reach OneSignal: ${error?.message || "network error"}`,
    };
  }
}

module.exports = {
  sendOtpSms,
  normalizePhoneE164,
};
