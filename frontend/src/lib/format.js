import { hasPhMobileFormat, isValidPhMobilePrefix } from "./phPrefixes";

export function formatPhonePH(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const part1 = digits.slice(0, 4);
  const part2 = digits.slice(4, 7);
  const part3 = digits.slice(7, 11);
  return [part1, part2, part3].filter(Boolean).join("-");
}

export function phoneDigits(value) {
  return value.replace(/\D/g, "");
}

export function isValidPhonePH(value) {
  const digits = phoneDigits(value);
  return hasPhMobileFormat(digits) && isValidPhMobilePrefix(digits);
}

export function toTitleCase(value) {
  return value.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
