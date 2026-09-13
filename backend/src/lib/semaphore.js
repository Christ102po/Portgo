const SEMAPHORE_BASE_URL = "https://api.semaphore.co/api/v4";

// Semaphore accepts Philippine mobile numbers as 09XXXXXXXXX, 9XXXXXXXXX,
// or 639XXXXXXXXX. PORTGO normalizes them to 639XXXXXXXXX for consistency.
function normalizePhoneForSemaphore(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("63")) return digits;
  if (digits.startsWith("0")) return `63${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `63${digits}`;
  return digits;
}

function getSemaphoreConfig() {
  return {
    apiKey: String(process.env.SEMAPHORE_API_KEY || "").trim(),
    senderName: String(process.env.SEMAPHORE_SENDER_NAME || "").trim(),
  };
}

function extractProviderMessage(data, raw) {
  if (Array.isArray(data)) {
    const first = data[0];
    return first?.message || first?.status || raw || "Unknown Semaphore response";
  }

  if (data && typeof data === "object") {
    return (
      data.message ||
      data.error ||
      data.detail ||
      data.status ||
      raw ||
      "Unknown Semaphore response"
    );
  }

  return raw || "Unknown Semaphore response";
}

async function postToSemaphore(endpoint, fields) {
  const { apiKey, senderName } = getSemaphoreConfig();

  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: "SMS service is not configured. Set SEMAPHORE_API_KEY in the server environment.",
    };
  }

  const form = new URLSearchParams({
    apikey: apiKey,
    ...fields,
  });

  // Sender Name is optional here. If omitted, Semaphore uses the account's
  // registered/default Sender Name. Only configure this after Semaphore has
  // approved the Sender Name in the account dashboard.
  if (senderName) form.set("sendername", senderName);

  try {
    const response = await fetch(`${SEMAPHORE_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: form.toString(),
    });

    const raw = await response.text().catch(() => "");
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Semaphore ${response.status}: ${extractProviderMessage(data, raw)}`,
        data,
      };
    }

    const first = Array.isArray(data) ? data[0] : data;
    if (!first) {
      return {
        ok: false,
        status: 502,
        error: "Semaphore returned an empty response.",
        data,
      };
    }

    const providerStatus = String(first.status || "").toLowerCase();
    if (["failed", "refunded", "error"].includes(providerStatus)) {
      return {
        ok: false,
        status: 502,
        error: `Semaphore rejected the SMS${providerStatus ? ` (${providerStatus})` : ""}.`,
        data,
      };
    }

    return {
      ok: true,
      data,
      messageId: first.message_id || null,
      providerStatus: first.status || null,
      providerCode: first.code != null ? String(first.code) : null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: `Unable to reach Semaphore: ${error?.message || "network error"}`,
    };
  }
}

async function sendSms(phone, message) {
  const number = normalizePhoneForSemaphore(phone);
  return postToSemaphore("messages", {
    number,
    message,
  });
}

async function sendOtpSms(phone, code, minutesValid = 5) {
  const number = normalizePhoneForSemaphore(phone);
  const message =
    `PORTGO verification code: {otp}. ` +
    `It expires in ${minutesValid} minutes. Do not share this code.`;

  const result = await postToSemaphore("otp", {
    number,
    message,
    code: String(code),
  });

  // Semaphore documents that the OTP response contains the actual code used.
  // If it returns a different code, do not allow PORTGO to keep a mismatched OTP.
  if (result.ok && result.providerCode && result.providerCode !== String(code)) {
    return {
      ok: false,
      status: 502,
      error: "Semaphore returned a different OTP than PORTGO requested.",
      data: result.data,
    };
  }

  return result;
}

module.exports = {
  sendSms,
  sendOtpSms,
  normalizePhoneForSemaphore,
};
