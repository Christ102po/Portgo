const SEMAPHORE_BASE_URL = "https://api.semaphore.co/api/v4";

// Railway values should normally be pasted without quotes. Accept wrapping
// quotes anyway so a value such as "abc123" does not become an invalid key.
function cleanEnvValue(value) {
  const text = String(value || "").trim();
  if (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'")))
  ) {
    return text.slice(1, -1).trim();
  }
  return text;
}

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
    apiKey: cleanEnvValue(process.env.SEMAPHORE_API_KEY),
    senderName: cleanEnvValue(process.env.SEMAPHORE_SENDER_NAME),
  };
}

function extractProviderMessage(data, raw) {
  if (Array.isArray(data)) {
    const first = data[0];
    if (typeof first === "string") return first;
    return first?.message || first?.error || first?.status || raw || "Unknown Semaphore response";
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

function safeUserMessage(result) {
  const text = String(result?.error || "").toLowerCase();
  const status = Number(result?.status || 0);

  if (status === 401 || status === 403 || /api.?key|apikey|unauthor|forbidden|authentication/.test(text)) {
    return "Semaphore rejected the API key. Re-copy SEMAPHORE_API_KEY in Railway without quotes or spaces, then redeploy.";
  }

  if (/sender.?name|sendername|sender id|sender/.test(text)) {
    return "Semaphore needs an approved Sender Name. Add your approved name to Railway as SEMAPHORE_SENDER_NAME, then redeploy.";
  }

  if (/credit|balance|insufficient/.test(text)) {
    return "Semaphore reports insufficient SMS credits for this OTP request.";
  }

  if (/recipient|mobile|phone|number/.test(text)) {
    return "Semaphore rejected this mobile number. Use a valid Philippine mobile number such as 09171234567.";
  }

  if (status === 429 || /rate.?limit|too many/.test(text)) {
    return "Semaphore is temporarily rate-limiting requests. Please wait a moment and try again.";
  }

  return "Semaphore could not send the OTP. Open Railway deployment logs and look for [OTP][SMS FAILED] for the provider error.";
}

async function parseResponse(response) {
  const raw = await response.text().catch(() => "");
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  return { raw, data };
}

async function postToSemaphore(endpoint, fields) {
  const { apiKey, senderName } = getSemaphoreConfig();

  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: "SMS service is not configured. Set SEMAPHORE_API_KEY in the server environment.",
      userMessage: "SMS verification is not configured on the server. Add SEMAPHORE_API_KEY in Railway and redeploy.",
    };
  }

  const form = new URLSearchParams({
    apikey: apiKey,
    ...fields,
  });

  // A Sender Name is optional only when the Semaphore account already has a
  // registered/default Sender Name. New accounts commonly need this variable.
  if (senderName) form.set("sendername", senderName);

  try {
    const response = await fetch(`${SEMAPHORE_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: form.toString(),
    });

    const { raw, data } = await parseResponse(response);

    if (!response.ok) {
      const result = {
        ok: false,
        status: response.status,
        error: `Semaphore ${response.status}: ${extractProviderMessage(data, raw)}`,
        data,
      };
      result.userMessage = safeUserMessage(result);
      return result;
    }

    const first = Array.isArray(data) ? data[0] : data;
    if (!first) {
      const result = {
        ok: false,
        status: 502,
        error: "Semaphore returned an empty response.",
        data,
      };
      result.userMessage = safeUserMessage(result);
      return result;
    }

    const providerStatus = String(first.status || "").toLowerCase();
    if (["failed", "refunded", "error"].includes(providerStatus)) {
      const result = {
        ok: false,
        status: 502,
        error: `Semaphore rejected the SMS${providerStatus ? ` (${providerStatus})` : ""}: ${extractProviderMessage(first, raw)}`,
        data,
      };
      result.userMessage = safeUserMessage(result);
      return result;
    }

    return {
      ok: true,
      data,
      messageId: first.message_id || null,
      providerStatus: first.status || null,
      providerCode: first.code != null ? String(first.code) : null,
    };
  } catch (error) {
    const result = {
      ok: false,
      status: 502,
      error: `Unable to reach Semaphore: ${error?.message || "network error"}`,
    };
    result.userMessage = safeUserMessage(result);
    return result;
  }
}

async function getSemaphoreJson(endpoint) {
  const { apiKey } = getSemaphoreConfig();
  if (!apiKey) {
    return { ok: false, status: 503, error: "SEMAPHORE_API_KEY is missing." };
  }

  try {
    const url = new URL(`${SEMAPHORE_BASE_URL}/${endpoint}`);
    url.searchParams.set("apikey", apiKey);
    const response = await fetch(url, { method: "GET" });
    const { raw, data } = await parseResponse(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Semaphore ${response.status}: ${extractProviderMessage(data, raw)}`,
        data,
      };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: `Unable to reach Semaphore: ${error?.message || "network error"}`,
    };
  }
}

// Safe startup diagnostic: validates the API key and checks whether the account
// has at least one active/approved sender name. It does NOT send an SMS and does
// not consume SMS credits.
async function verifySemaphoreConfiguration() {
  const { apiKey, senderName } = getSemaphoreConfig();
  if (!apiKey) {
    return {
      ok: false,
      message: "SEMAPHORE_API_KEY is missing.",
    };
  }

  const accountResult = await getSemaphoreJson("account");
  if (!accountResult.ok) {
    return {
      ok: false,
      message: accountResult.error,
    };
  }

  const senderResult = await getSemaphoreJson("account/sendernames");
  const senders = senderResult.ok && Array.isArray(senderResult.data) ? senderResult.data : [];
  const activeSenders = senders.filter((item) => {
    const status = String(item?.status || "").toLowerCase();
    return ["active", "approved"].includes(status);
  });

  if (senderName) {
    const requested = activeSenders.find(
      (item) => String(item?.name || "").toLowerCase() === senderName.toLowerCase()
    );
    if (senderResult.ok && !requested) {
      return {
        ok: false,
        message: `SEMAPHORE_SENDER_NAME=${senderName} is not listed as an active/approved Sender Name on the Semaphore account.`,
      };
    }
  } else if (senderResult.ok && activeSenders.length === 0) {
    return {
      ok: false,
      message: "No active/approved Semaphore Sender Name was found. Create/approve one, then set SEMAPHORE_SENDER_NAME in Railway.",
    };
  }

  const account = Array.isArray(accountResult.data) ? accountResult.data[0] : accountResult.data;
  return {
    ok: true,
    accountStatus: account?.status || "unknown",
    creditBalance: account?.credit_balance ?? null,
    senderName: senderName || activeSenders[0]?.name || "account default",
  };
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
      userMessage: "Semaphore returned a mismatched OTP. Please try again.",
      data: result.data,
    };
  }

  return result;
}

module.exports = {
  sendSms,
  sendOtpSms,
  normalizePhoneForSemaphore,
  verifySemaphoreConfiguration,
  getSemaphoreConfig,
};
