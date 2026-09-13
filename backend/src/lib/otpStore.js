const store = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setCode(phone) {
  const code = generateCode();
  store.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
  return code;
}

function verifyCode(phone, code) {
  const entry = store.get(phone);
  if (!entry) return { ok: false, message: "No code was requested for this number" };
  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return { ok: false, message: "Code has expired, please request a new one" };
  }
  if (entry.code !== code) {
    return { ok: false, message: "Invalid code" };
  }
  store.delete(phone);
  return { ok: true };
}

function clearCode(phone) {
  store.delete(phone);
}

module.exports = { setCode, verifyCode, clearCode, OTP_TTL_MS };
