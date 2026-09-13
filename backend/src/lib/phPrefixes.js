// Mirror of frontend/src/lib/phPrefixes.js — keep both in sync.
// Known NTC-assigned Philippine mobile number prefixes, grouped by carrier.
// Prefix blocks are periodically expanded by the NTC — review and refresh this list as new ranges are assigned.
const PH_MOBILE_PREFIXES = {
  GLOBE_TM: [
    "0817", "0904", "0905", "0906", "0915", "0916", "0917", "0926", "0927",
    "0935", "0936", "0937", "0945", "0953", "0954", "0955", "0956",
    "0965", "0966", "0967", "0975", "0976", "0977", "0978", "0979",
    "0994", "0995", "0996", "0997",
  ],
  SMART_TNT_SUN: [
    "0813", "0907", "0908", "0909", "0910", "0912",
    "0918", "0919", "0920", "0921", "0928", "0929", "0930",
    "0938", "0939", "0946", "0947", "0948", "0949", "0950", "0951",
    "0961", "0963", "0964", "0968", "0969", "0970",
    "0981", "0982", "0989", "0992", "0998", "0999",
  ],
  DITO: ["0895", "0896", "0897", "0898", "0991", "0993"],
};

const ALL_PH_MOBILE_PREFIXES = new Set(Object.values(PH_MOBILE_PREFIXES).flat());

const INVALID_PH_PREFIX_MESSAGE =
  "Invalid Philippine Mobile Prefix: Please enter a valid Globe, Smart, or DITO mobile number.";

function isValidPhMobileNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11 || !digits.startsWith("09")) return false;
  return ALL_PH_MOBILE_PREFIXES.has(digits.slice(0, 4));
}

module.exports = { PH_MOBILE_PREFIXES, ALL_PH_MOBILE_PREFIXES, INVALID_PH_PREFIX_MESSAGE, isValidPhMobileNumber };
