import { hasPhMobileFormat, isValidPhMobilePrefix } from "./phPrefixes";

// Tourist contact numbers are optional and international. PH-selected numbers get the same
// strict telco-prefix check as the Local flow; other countries get a lenient digit-count check
// since we don't maintain prefix data for every country's carriers.
export function isValidTouristPhone(countryCode, rawValue) {
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return true;
  if (countryCode === "+63") {
    const normalized = digits.length === 10 && digits.startsWith("9") ? `0${digits}` : digits;
    return hasPhMobileFormat(normalized) && isValidPhMobilePrefix(normalized);
  }
  return digits.length >= 7 && digits.length <= 14;
}
