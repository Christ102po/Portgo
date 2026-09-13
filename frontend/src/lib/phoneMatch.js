// Normalizes any PH mobile number format down to its bare 10-digit local
// form (e.g. "9171234567") so phone lookups match regardless of how the
// number was typed in — with/without a leading 0, with/without the +63/63
// country code, with or without spaces/dashes. Mirrors
// backend/src/lib/phoneMatch.js — keep both in sync.
export function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}
