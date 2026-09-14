const crypto = require("crypto");

const store = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

function normalizeIdentifier(identifier) {
  const value = String(identifier || "").trim();
  if (value.includes("@")) return value.toLowerCase();

  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("63")) return `+${digits}`;
  if (digits.startsWith("0")) return `+63${digits.slice(1)}`;
  return `+${digits}`;
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function setCode(identifier) {
  const key = normalizeIdentifier(identifier);
  const now = Date.now();
  const existing = store.get(key);

  if (existing && now < existing.resendAllowedAt) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resendAllowedAt - now) / 1000)),
    };
  }

  const code = generateCode();
  store.set(key, {
    code,
    expiresAt: now + OTP_TTL_MS,
    resendAllowedAt: now + OTP_RESEND_COOLDOWN_MS,
    attempts: 0,
  });

  return { ok: true, code };
}

function verifyCode(identifier, code) {
  const key = normalizeIdentifier(identifier);
  const entry = store.get(key);

  if (!entry) return { ok: false, message: "No verification code was requested for this contact" };

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return { ok: false, message: "Code has expired, please request a new one" };
  }

  entry.attempts += 1;

  if (entry.code !== String(code)) {
    if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
      store.delete(key);
      return { ok: false, message: "Too many incorrect attempts. Please request a new code." };
    }

    store.set(key, entry);
    return {
      ok: false,
      message: `Invalid code. ${MAX_VERIFY_ATTEMPTS - entry.attempts} attempt(s) remaining.`,
    };
  }

  store.delete(key);
  return { ok: true };
}

function clearCode(identifier) {
  store.delete(normalizeIdentifier(identifier));
}

module.exports = {
  setCode,
  verifyCode,
  clearCode,
  normalizeIdentifier,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  MAX_VERIFY_ATTEMPTS,
};
