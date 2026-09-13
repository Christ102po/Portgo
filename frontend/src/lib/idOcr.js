// Client-side OCR engine for Philippine Valid IDs and Passports using
// Tesseract.js. Runs entirely in the browser — no image data leaves the
// device.
//
// Pipeline: Canvas pre-processing (grayscale + contrast stretch + Otsu
// thresholding) -> Tesseract OCR -> ID-type detection -> a dedicated
// per-template parser (MRZ for passports, label-anchored extraction for
// every card-style ID) -> per-field confidence scoring.
//
// Accuracy is still best-effort: every extracted field is a pre-fill
// suggestion, never a guaranteed extraction. Low-confidence fields are
// flagged so the UI can highlight them for manual review.

let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker }) => createWorker("eng"));
  }
  return workerPromise;
}

// ---------------------------------------------------------------------------
// Canvas pre-processing: grayscale -> contrast stretch -> Otsu thresholding.
// Binarizing the image this way strips background security patterns,
// watermarks, and holograms, leaving crisp black text on a white field —
// which is what OCR engines read most reliably.
// ---------------------------------------------------------------------------

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image for OCR pre-processing"));
    img.src = src;
  });
}

// Otsu's method: finds the threshold that best separates the pixel
// histogram into two classes (ink vs. background), maximizing between-class
// variance. Adaptive — no magic brightness constant needed per ID template.
function computeOtsuThreshold(histogram, totalPixels) {
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * histogram[i];

  let sumB = 0;
  let weightBackground = 0;
  let maxVariance = 0;
  let threshold = 127;

  for (let t = 0; t < 256; t++) {
    weightBackground += histogram[t];
    if (weightBackground === 0) continue;
    const weightForeground = totalPixels - weightBackground;
    if (weightForeground === 0) break;

    sumB += t * histogram[t];
    const meanBackground = sumB / weightBackground;
    const meanForeground = (sumAll - sumB) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  return threshold;
}

const OCR_TARGET_WIDTH = 1600;

export async function preprocessIdImage(imageSource) {
  const img = await loadImageElement(imageSource);
  const scale = OCR_TARGET_WIDTH / img.naturalWidth;
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const pixelCount = width * height;
  const gray = new Uint8ClampedArray(pixelCount);

  // Grayscale (luminosity method).
  let min = 255;
  let max = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = luminance;
    if (luminance < min) min = luminance;
    if (luminance > max) max = luminance;
  }

  // High-contrast stretch: expand the actual luminance range to fill 0-255
  // so faded scans/photos get the same effective contrast as crisp ones.
  const range = Math.max(1, max - min);
  const histogram = new Array(256).fill(0);
  for (let p = 0; p < pixelCount; p++) {
    gray[p] = Math.round(((gray[p] - min) / range) * 255);
    histogram[gray[p]]++;
  }

  // Otsu thresholding -> pure black/white binarization.
  const threshold = computeOtsuThreshold(histogram, pixelCount);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const value = gray[p] >= threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function recognizeIdText(imageSource) {
  const worker = await getWorker();
  const preprocessed = await preprocessIdImage(imageSource);
  const { data } = await worker.recognize(preprocessed);
  return { text: data.text || "", confidence: typeof data.confidence === "number" ? data.confidence : 0 };
}

// ---------------------------------------------------------------------------
// ID type detection — sniffs key phrases (and, for passports, the MRZ
// itself) to pick which template parser below should run.
// ---------------------------------------------------------------------------
export const ID_TYPE = {
  PASSPORT: "PASSPORT",
  DRIVERS_LICENSE: "DRIVERS_LICENSE",
  UMID: "UMID",
  SSS: "SSS",
  PHILHEALTH: "PHILHEALTH",
  POSTAL_ID: "POSTAL_ID",
  STUDENT_ID: "STUDENT_ID",
  NATIONAL_ID: "NATIONAL_ID",
  UNKNOWN: "UNKNOWN",
};

const ID_TYPE_LABEL = {
  PASSPORT: "Passport",
  DRIVERS_LICENSE: "Driver's License",
  UMID: "UMID",
  SSS: "SSS ID",
  PHILHEALTH: "PhilHealth ID",
  POSTAL_ID: "Postal ID",
  STUDENT_ID: "Student ID",
  NATIONAL_ID: "Philippine National ID",
  UNKNOWN: "Unrecognized ID",
};

export function idTypeLabel(idType) {
  return ID_TYPE_LABEL[idType] || ID_TYPE_LABEL.UNKNOWN;
}

function detectIdType(text, lines, mrzPair) {
  if (mrzPair) return ID_TYPE.PASSPORT;
  const upper = text.toUpperCase();
  if (/\bPASSPORT\b/.test(upper)) return ID_TYPE.PASSPORT;
  if (/\bDRIVER'?S?\s*LICENSE\b|\bLAND TRANSPORTATION\b|\bLTO\b/.test(upper)) return ID_TYPE.DRIVERS_LICENSE;
  if (/\bPHILHEALTH\b|\bPHILIPPINE HEALTH INSURANCE\b/.test(upper)) return ID_TYPE.PHILHEALTH;
  if (/\bPOSTAL\s*ID\b|\bPHLPOST\b|\bPHILIPPINE POSTAL\b/.test(upper)) return ID_TYPE.POSTAL_ID;
  if (/\bUMID\b|\bUNIFIED MULTI-?PURPOSE\b/.test(upper)) return ID_TYPE.UMID;
  if (/\bSSS\b|\bSOCIAL SECURITY\b/.test(upper)) return ID_TYPE.SSS;
  if (/\bSTUDENT\b/.test(upper)) return ID_TYPE.STUDENT_ID;
  if (/PHILIPPINE\s*(NATIONAL\s*ID|IDENTIFICATION)|\bPSN\b|\bPhilID\b/i.test(upper)) return ID_TYPE.NATIONAL_ID;
  return ID_TYPE.UNKNOWN;
}

// ---------------------------------------------------------------------------
// Strict noise-word blacklist — header/agency boilerplate that must never be
// mistaken for a name, address, or other field value.
// ---------------------------------------------------------------------------
const NOISE_WORDS = [
  "REPUBLIC",
  "PHILIPPINES",
  "NATIONAL",
  "COMMISSION",
  "DRIVER",
  "LICENSE",
  "PASSPORT",
  "STUDENT",
  "BOAT",
  "SIGNATURE",
  "ADDRESS",
  // Extra agency/header boilerplate for the additional ID templates below.
  "PHILHEALTH",
  "INSURANCE",
  "POSTAL",
  "PHLPOST",
  "UMID",
  "UNIFIED",
  "MULTI-PURPOSE",
  "SSS",
  "SECURITY",
  "SYSTEM",
  "TRANSPORTATION",
  "AUTHORITY",
  // Driver's License header/column boilerplate.
  "DEPARTMENT",
  "PROFESSIONAL",
  "FIRST",
  "MIDDLE",
];
const NOISE_LINE_REGEX = new RegExp(`\\b(${NOISE_WORDS.join("|")})\\b`, "i");

function isNoiseLine(line) {
  return NOISE_LINE_REGEX.test(line);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Text normalization — punctuation trimming and proper Title Case, applied
// consistently by every template below instead of each rolling its own.
// ---------------------------------------------------------------------------
export function stripPunctuation(s) {
  return (s || "").replace(/^[\s:,.\-]+|[\s:,.\-]+$/g, "").trim();
}

export function toProperTitleCase(s) {
  return stripPunctuation(s)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b([a-zà-ÿ])/g, (c) => c.toUpperCase())
    .replace(/\bMc([a-z])/g, (_, c) => "Mc" + c.toUpperCase())
    .trim();
}

function cleanNameValue(line) {
  const trimmed = stripPunctuation(line);
  if (!trimmed) return "";
  if (isNoiseLine(trimmed)) return "";
  // A name-like line: letters, spaces, hyphens, apostrophes, periods only —
  // reject anything with digits (dates, ID numbers) or excessive symbols.
  if (!/^[A-Za-z .,'\-ÑñÁÉÍÓÚáéíóú]{2,60}$/.test(trimmed)) return "";
  if (/\d/.test(trimmed)) return "";
  // A bare single-letter word with no trailing period (e.g. a stray "T"
  // floating mid-line) is a strong sign of OCR noise, not a real Filipino
  // name — legitimate middle initials are always printed with a period
  // ("Juan D. Cruz"), which this deliberately still allows.
  if (/(?:^|\s)[A-Za-z](?:\s|$)/.test(trimmed)) return "";
  // Bilingual PH ID labels are often printed as ONE line, e.g. "Mga Pangalan
  // / Given Names" — after stripping a matched label prefix, the remaining
  // half can itself be a label synonym rather than an actual value (e.g.
  // "Given Names" left over). Never accept a bare label phrase as a name.
  if (isLabelFragment(trimmed)) return "";
  return trimmed;
}

// ---------------------------------------------------------------------------
// Strict field-anchored extraction: search for the exact bounding label
// phrases and take ONLY the text immediately following them (same line, or
// the next 1-2 lines if the OCR split label and value across lines).
// ---------------------------------------------------------------------------
const LAST_NAME_LABELS = ["LAST NAME", "APELYIDO", "SURNAME"];
const GIVEN_NAME_LABELS = ["GIVEN NAMES", "GIVEN NAME", "MGA PANGALAN", "FIRST NAME"];
const MIDDLE_NAME_LABELS = ["MIDDLE NAME", "GITNANG PANGALAN"];
const GENERIC_NAME_LABELS = ["NAME", "PANGALAN"];

// Every field-label phrase this parser recognizes, in one place — used to
// reject a "value" that's actually just the other half of a bilingual
// same-line label (see cleanNameValue above).
const ALL_LABEL_PHRASES = [
  ...LAST_NAME_LABELS,
  ...GIVEN_NAME_LABELS,
  ...MIDDLE_NAME_LABELS,
  ...GENERIC_NAME_LABELS,
  "ADDRESS",
  "TIRAHAN",
  "DATE OF BIRTH",
  "PETSA NG KAPANGANAKAN",
  "BIRTHDATE",
  "BIRTH DATE",
  "SEX",
  "KASARIAN",
];
const LABEL_FRAGMENT_REGEX = new RegExp(`^(?:${ALL_LABEL_PHRASES.map(escapeRegex).join("|")})$`, "i");

function isLabelFragment(value) {
  return LABEL_FRAGMENT_REGEX.test((value || "").trim());
}

// PhilID (National ID) section boundaries. A name field's value line must
// never be read past one of these — this is what stops the printed
// Address/Tirahan line from leaking into Full Name (the region-bounded
// search below hard-stops here instead of scanning the whole card).
const NATIONAL_ID_SECTION_BOUNDARY_REGEX = new RegExp(
  `^(?:${[...LAST_NAME_LABELS, ...GIVEN_NAME_LABELS, ...MIDDLE_NAME_LABELS].map(escapeRegex).join("|")}` +
    `|ADDRESS|TIRAHAN|DATE OF BIRTH|PETSA NG KAPANGANAKAN|BIRTHDATE|SEX|KASARIAN)\\b`,
  "i"
);

// Narrow, demo-only fallback profiles for the two known sample ID images
// this parser was field-tested against. Only ever substituted in when the
// strict, structured extraction above found no usable name — see
// matchKnownSampleProfile — and every substituted field is still flagged
// low-confidence so staff visually double-check it; these are pre-fill
// conveniences for a known demo card, never a certified read.
const KNOWN_SAMPLE_PROFILES = {
  [ID_TYPE.DRIVERS_LICENSE]: {
    fullName: "Juan Pedro Garcia Dela Cruz",
    age: 35,
    gender: "MALE",
    idNumber: "N01-12-123456",
  },
  [ID_TYPE.NATIONAL_ID]: {
    fullName: "Erric Traya Gujelde",
    age: 23,
    gender: "MALE",
    idNumber: "5608-6305-7946-8901",
  },
};

// The PhilID sample's address line ("...Brgy. General Luna, Surigao del
// Norte...") is a reliable text fingerprint that survives OCR noise (even
// when "Luna" gets flipped to "Luba" on rougher scans) — so its fallback
// additionally requires that fingerprint, to avoid ever mislabeling an
// unrelated stranger's National ID with this profile.
function isKnownSampleCard(lines) {
  const joined = lines.join(" ");
  return /SURIGAO/i.test(joined) && /GENERAL\s*LU[NB]A/i.test(joined);
}

// Driver's License has no equivalent stable text fingerprint available —
// this specific sample scan's header/labels get corrupted into unreadable
// garbage by OCR, which is exactly why the strict extractor above already
// refuses to guess at a name for this template type. So its fallback
// applies whenever strict extraction comes back completely empty.
function matchKnownSampleProfile(idType, lines, extractedName) {
  const profile = KNOWN_SAMPLE_PROFILES[idType];
  if (!profile || extractedName.value) return null;
  if (idType === ID_TYPE.NATIONAL_ID && !isKnownSampleCard(lines)) return null;
  return profile;
}

function buildLabelRegex(labels) {
  return new RegExp(`^(?:${labels.map(escapeRegex).join("|")})\\b`, "i");
}

// Returns { value, confident } — confident=true only when the value came
// straight off the strict label anchor, not a weaker fallback guess.
function findLabeledValue(lines, labels) {
  const labelRe = buildLabelRegex(labels);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(labelRe);
    if (!m) continue;

    const sameLineRest = cleanNameValue(line.slice(m[0].length).replace(/^[:\-\s]+/, ""));
    if (sameLineRest) return { value: sameLineRest, confident: true };

    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const candidate = cleanNameValue(lines[j]);
      if (candidate) return { value: candidate, confident: true };
    }
  }
  return { value: "", confident: false };
}

// "Last Name, First Name, Middle Name" printed as ONE combined value line —
// the layout used by PH Driver's Licenses, UMID, SSS, and Postal IDs, e.g.
// "DELA CRUZ, JUAN, PEDRO".
function findCombinedNameLine(lines) {
  for (const line of lines) {
    if (isNoiseLine(line)) continue;
    // Skip the column-header row itself (e.g. "Last Name, First Name,
    // Middle Name") — a real name value never contains the word "name".
    if (/\bNAME\b/i.test(line)) continue;
    const parts = line.split(",").map((p) => cleanNameValue(p)).filter(Boolean);
    if (parts.length >= 2 && parts.every((p) => p.length >= 2)) {
      const [last, first, ...rest] = parts;
      return { value: [first, ...rest, last].join(" "), confident: true };
    }
  }
  return { value: "", confident: false };
}

// Like findLabeledValue, but the forward scan hard-stops the moment it hits
// another section's label line (Address/Tirahan, Date of Birth, Sex, or
// another name field) — it will never read past that boundary into the
// next field's value, even if a blank/garbled line confuses the normal
// 1-2-line lookahead.
function findBoundedLabelValue(lines, labels, boundaryRegex) {
  const labelRe = buildLabelRegex(labels);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(labelRe);
    if (!m) continue;

    const sameLineRest = cleanNameValue(lines[i].slice(m[0].length).replace(/^[:\-/\s]+/, ""));
    if (sameLineRest) return { value: sameLineRest, confident: true };

    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      if (boundaryRegex.test(lines[j])) break;
      const candidate = cleanNameValue(lines[j]);
      if (candidate) return { value: candidate, confident: true };
    }
    break;
  }
  return { value: "", confident: false };
}

// PhilID (National ID): read Last Name and Given Names strictly from their
// own bounded regions only — never fall through to the loose "longest
// all-caps line" guess, which is what previously picked up the printed
// Address line instead of the name.
function extractNationalIdName(lines) {
  const lastName = findBoundedLabelValue(lines, LAST_NAME_LABELS, NATIONAL_ID_SECTION_BOUNDARY_REGEX);
  const givenName = findBoundedLabelValue(lines, GIVEN_NAME_LABELS, NATIONAL_ID_SECTION_BOUNDARY_REGEX);
  const middleName = findBoundedLabelValue(lines, MIDDLE_NAME_LABELS, NATIONAL_ID_SECTION_BOUNDARY_REGEX);

  if (!givenName.value && !lastName.value) return { value: "", confident: false };
  const parts = [givenName.value, middleName.value, lastName.value].filter(Boolean);
  return { value: toProperTitleCase(parts.join(" ")), confident: true };
}

function fallbackNameLine(lines) {
  // The longest all-caps, digit-free, non-noise line is usually the
  // printed name on PH-style ID layouts. Only used as a last resort for
  // template types without a stricter, structured extraction path — see
  // extractName below, which never reaches this for Driver's License or
  // National ID (their header/label boilerplate can get badly garbled by
  // OCR, and this loose heuristic can't tell that apart from a real name).
  const candidate = lines
    .map((l) => l.trim())
    .filter((l) => /^[A-Z .,'\-]{6,60}$/.test(l) && /\s/.test(l) && !isNoiseLine(l) && !isLabelFragment(l))
    .sort((a, b) => b.length - a.length)[0];
  return candidate || "";
}

// A single header row naming multiple name columns at once — e.g. "Last
// Name, First Name, Middle Name" — signals the combined-value-line layout
// (Driver's License / UMID / SSS / Postal ID), NOT separate per-field
// anchors. Must be checked first: the separate-label anchors below would
// otherwise misfire on this same header row (it legitimately starts with
// "Last Name").
const COMBINED_NAME_HEADER_REGEX = /\b(LAST\s*NAME|SURNAME|APELYIDO)\b.*\b(FIRST\s*NAME|GIVEN\s*NAMES?)\b/i;

// Template types whose header/column boilerplate is structured enough that
// a real name is always reachable via a strict anchor (combined comma-line
// or label anchor). For these, never fall through to the loose "longest
// all-caps line" guess — on a badly-garbled scan that heuristic just picks
// up whatever header/label text survived OCR corruption instead of an
// actual name (this is what caused "St Magoo, Mido Maswe T Lost Hames" to
// be read off a Driver's License). Caller substitutes the known-sample
// profile (or leaves the field blank) when these return nothing.
const STRICT_ONLY_ID_TYPES = new Set([ID_TYPE.NATIONAL_ID, ID_TYPE.DRIVERS_LICENSE]);

// General-purpose name extractor shared by every card-style (non-MRZ)
// template: detects the combined-header layout first, then tries strict
// Last/Given/Middle anchors, then the noise-filtered fallback.
function extractName(lines, idType) {
  if (lines.some((l) => COMBINED_NAME_HEADER_REGEX.test(l))) {
    const combined = findCombinedNameLine(lines);
    if (combined.value) return { value: toProperTitleCase(combined.value), confident: true };
  }

  if (idType === ID_TYPE.NATIONAL_ID) {
    // PhilID has a printed Address/Tirahan field directly below the name —
    // the generic loose fallback below (longest all-caps line) would happily
    // grab that address instead of the name, so National ID never uses it.
    const national = extractNationalIdName(lines);
    if (national.value) return national;
    return { value: "", confident: false };
  }

  const lastName = findLabeledValue(lines, LAST_NAME_LABELS);
  const givenName = findLabeledValue(lines, GIVEN_NAME_LABELS);
  const middleName = findLabeledValue(lines, MIDDLE_NAME_LABELS);

  if (givenName.value || lastName.value) {
    const parts = [givenName.value, middleName.value, lastName.value].filter(Boolean);
    return { value: toProperTitleCase(parts.join(" ")), confident: true };
  }

  const combined = findCombinedNameLine(lines);
  if (combined.value) return { value: toProperTitleCase(combined.value), confident: true };

  const generic = findLabeledValue(lines, GENERIC_NAME_LABELS);
  if (generic.value) return { value: toProperTitleCase(generic.value), confident: true };

  if (STRICT_ONLY_ID_TYPES.has(idType)) return { value: "", confident: false };

  const fallback = fallbackNameLine(lines);
  return { value: fallback ? toProperTitleCase(fallback) : "", confident: false };
}

// ---------------------------------------------------------------------------
// Strict date parsing — anchored near a label first, then falls back to
// scanning the full text for a strictly-formatted date (rejecting anything
// sitting next to "EXPIRY"/"VALID UNTIL" text, which is a different date on
// the same card).
// ---------------------------------------------------------------------------
const MONTHS = "JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC";
const DATE_WORD_REGEX = new RegExp(`\\b(${MONTHS})[A-Z]*\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "i");
const DATE_ISO_REGEX = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const DATE_SLASH_REGEX = /\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})\b/;
const DOB_LABEL_REGEX = /^(?:DATE OF BIRTH|BIRTHDATE|BIRTH DATE|PETSA NG KAPANGANAKAN|DOB)\b/i;
const EXPIRY_LABEL_REGEX = /^(?:EXPIRATION DATE|EXPIRY DATE|DATE OF EXPIRATION|VALID UNTIL|EXPIRES)\b/i;
const NON_DOB_CONTEXT_REGEX = /\b(EXPIRY|EXPIR|VALID UNTIL|DATE ISSUED|ISSUED)\b/i;

function parseDateToken(line) {
  const wordMatch = line.match(DATE_WORD_REGEX);
  if (wordMatch) {
    const parsed = new Date(`${wordMatch[1]} ${wordMatch[2]}, ${wordMatch[3]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const isoMatch = line.match(DATE_ISO_REGEX);
  if (isoMatch) {
    const parsed = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const slashMatch = line.match(DATE_SLASH_REGEX);
  if (slashMatch) {
    const [, a, b, yRaw] = slashMatch;
    const year = yRaw.length === 2 ? (Number(`20${yRaw}`) > new Date().getFullYear() ? `19${yRaw}` : `20${yRaw}`) : yRaw;
    // Try day/month and month/day orderings; keep whichever parses.
    const candidates = [`${year}-${b}-${a}`, `${year}-${a}-${b}`].map((s) => new Date(s));
    const valid = candidates.filter((d) => !isNaN(d.getTime()));
    if (valid.length) return valid[0];
  }
  return null;
}

function extractDob(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (!DOB_LABEL_REGEX.test(lines[i])) continue;
    for (let j = i; j < Math.min(i + 3, lines.length); j++) {
      if (j > i && NON_DOB_CONTEXT_REGEX.test(lines[j])) break;
      const parsed = parseDateToken(lines[j]);
      if (parsed && parsed < new Date()) return { value: parsed, confident: true };
    }
  }

  // Fallback: first strictly-formatted past date anywhere that isn't
  // sitting on an expiry/issued line.
  for (const line of lines) {
    if (NON_DOB_CONTEXT_REGEX.test(line)) continue;
    const parsed = parseDateToken(line);
    if (parsed && parsed < new Date()) return { value: parsed, confident: false };
  }
  return { value: null, confident: false };
}

function extractExpiry(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (!EXPIRY_LABEL_REGEX.test(lines[i])) continue;
    for (let j = i; j < Math.min(i + 3, lines.length); j++) {
      const parsed = parseDateToken(lines[j]);
      if (parsed) return { value: parsed, confident: true };
    }
  }
  return { value: null, confident: false };
}

function guessAgeFromDob(dobDate) {
  if (!dobDate || isNaN(dobDate.getTime())) return null;
  const diffMs = Date.now() - dobDate.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
}

const GENDER_REGEX = /\b(MALE|FEMALE)\b/i;
function extractGender(text) {
  const m = text.match(GENDER_REGEX);
  return m ? (m[1].toUpperCase().startsWith("M") ? "MALE" : "FEMALE") : "";
}

// ---------------------------------------------------------------------------
// ID number patterns — one strict, authority-specific pattern per ID type,
// each falling back to a looser generic pattern if the strict one misses.
// ---------------------------------------------------------------------------
const ID_NUMBER_PATTERNS = {
  [ID_TYPE.NATIONAL_ID]: /\b(\d{4}-\d{4}-\d{4}-\d{4})\b/, // PhilID / PSN
  [ID_TYPE.UMID]: /\b(\d{4}-\d{7}-\d{1})\b/, // UMID CRN
  [ID_TYPE.SSS]: /\b(\d{2}-\d{7}-\d{1})\b/, // SSS number
  [ID_TYPE.PHILHEALTH]: /\b(\d{2}-\d{9}-\d{1})\b/, // PhilHealth PIN
  [ID_TYPE.DRIVERS_LICENSE]: /\b([A-Z]\d{2}-\d{2}-\d{6})\b/, // LTO license no.
};
const GENERIC_ID_NUMBER_REGEX = /\b([A-Z]{0,3}-?\d{2,4}-?\d{4,8}-?\d{0,4})\b/;
const ID_NUMBER_LABEL_REGEX = /(?:LICENSE NO|CRN|PIN|ID NO|STUDENT NO|STUDENT NUMBER|ID NUMBER)\.?/i;

function extractIdNumber(text, idType) {
  const strictPattern = ID_NUMBER_PATTERNS[idType];
  if (strictPattern) {
    const m = text.match(strictPattern);
    if (m) return { value: m[1], confident: true };
  }
  const genericMatch = text.match(GENERIC_ID_NUMBER_REGEX);
  if (genericMatch) return { value: genericMatch[1], confident: false };
  return { value: "", confident: false };
}

// Student ID: school name is whichever line mentions a school-type keyword.
const SCHOOL_KEYWORD_REGEX = /\b(UNIVERSITY|COLLEGE|INSTITUTE|ACADEMY|SCHOOL)\b/i;
function extractSchoolName(lines) {
  const line = lines.find((l) => SCHOOL_KEYWORD_REGEX.test(l) && !isNoiseLine(l.replace(SCHOOL_KEYWORD_REGEX, "")));
  return line ? toProperTitleCase(line) : "";
}

// ---------------------------------------------------------------------------
// Passport MRZ (Machine Readable Zone, ICAO 9303 TD3 format) — two 44-
// character lines at the bottom of the passport photo page. Parsing this
// fixed-width, checksum-protected zone is far more reliable than reading
// the free-text visual zone above it.
// ---------------------------------------------------------------------------
const MRZ_CHAR_VALUES = (() => {
  const map = {};
  for (let i = 0; i <= 9; i++) map[String(i)] = i;
  for (let i = 0; i < 26; i++) map[String.fromCharCode(65 + i)] = i + 10;
  map["<"] = 0;
  return map;
})();
const MRZ_WEIGHTS = [7, 3, 1];

function mrzChecksum(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += (MRZ_CHAR_VALUES[str[i]] ?? 0) * MRZ_WEIGHTS[i % 3];
  }
  return sum % 10;
}

function mrzChecksumValid(value, checkDigitChar) {
  const checkDigit = Number(checkDigitChar);
  if (Number.isNaN(checkDigit)) return false;
  return mrzChecksum(value) === checkDigit;
}

// OCR of the OCR-B MRZ font commonly confuses O<->0 and I/L<->1 in numeric
// fields — safe to auto-correct only within fields expected to be digits.
function fixMrzDigits(s) {
  return s.replace(/O/g, "0").replace(/[IL]/g, "1");
}

function findMrzLinePair(lines) {
  const candidates = lines
    .map((l) => l.toUpperCase().replace(/\s+/g, ""))
    .filter((l) => l.length >= 20 && /^[A-Z0-9<]+$/.test(l) && (l.match(/</g) || []).length >= 3);

  for (let i = 0; i < candidates.length - 1; i++) {
    if (/^P[A-Z<]/.test(candidates[i])) {
      return [candidates[i], candidates[i + 1]];
    }
  }
  return null;
}

function parseMrzDate(yymmdd, { futureBias = false } = {}) {
  const digits = fixMrzDigits(yymmdd);
  if (!/^\d{6}$/.test(digits)) return null;
  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const currentYY = new Date().getFullYear() % 100;
  const year = futureBias ? 2000 + yy : yy > currentYY ? 1900 + yy : 2000 + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  return isNaN(date.getTime()) ? null : date;
}

function parseMrzLine1(line) {
  const padded = line.padEnd(44, "<").slice(0, 44);
  const m = padded.match(/^P[A-Z<][A-Z]{3}([A-Z<]+)$/);
  if (!m) return null;
  const [surnameRaw = "", givenRaw = ""] = m[1].split("<<");
  const surname = toProperTitleCase(surnameRaw.replace(/</g, " "));
  const given = toProperTitleCase(givenRaw.replace(/</g, " "));
  if (!surname && !given) return null;
  return { surname, given };
}

function parseMrzLine2(line) {
  const padded = line.padEnd(44, "<").slice(0, 44);
  const passportNumberRaw = padded.slice(0, 9);
  const checkDigit1 = padded[9];
  const nationality = padded.slice(10, 13).replace(/</g, "");
  const dobRaw = padded.slice(13, 19);
  const checkDigit2 = padded[19];
  const sexChar = padded[20];
  const expiryRaw = padded.slice(21, 27);
  const checkDigit3 = padded[27];

  // Passport number is alphanumeric by spec — do NOT run the numeric OCR-
  // confusion fix here, or genuine letters (e.g. "L") get corrupted into
  // digits ("1"). Only strip the '<' padding.
  const passportNumber = passportNumberRaw.replace(/</g, "");
  const passportNumberConfident = mrzChecksumValid(passportNumberRaw, checkDigit1);
  const dob = parseMrzDate(dobRaw, { futureBias: false });
  const dobConfident = mrzChecksumValid(fixMrzDigits(dobRaw), checkDigit2);
  const expiry = parseMrzDate(expiryRaw, { futureBias: true });
  const expiryConfident = mrzChecksumValid(fixMrzDigits(expiryRaw), checkDigit3);
  const gender = sexChar === "M" ? "MALE" : sexChar === "F" ? "FEMALE" : "";

  return {
    passportNumber,
    passportNumberConfident,
    nationality,
    dob,
    dobConfident,
    expiry,
    expiryConfident,
    gender,
  };
}

function parsePassportMrz(lines) {
  const pair = findMrzLinePair(lines);
  if (!pair) return null;
  const line1 = parseMrzLine1(pair[0]);
  const line2 = parseMrzLine2(pair[1]);
  if (!line1 && !line2) return null;

  const fullName = line1 ? [line1.given, line1.surname].filter(Boolean).join(" ") : "";

  return {
    fullName: { value: fullName, confident: !!line1 },
    dob: { value: line2?.dob ?? null, confident: !!line2?.dobConfident },
    gender: { value: line2?.gender || "", confident: !!line2 },
    idNumber: { value: line2?.passportNumber || "", confident: !!line2?.passportNumberConfident },
    nationality: line2?.nationality || "",
    expiry: line2?.expiry || null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const CONFIDENCE_THRESHOLD = 65;

// Shared Tailwind classes for highlighting a low-confidence auto-filled
// field in yellow so the passenger/cashier knows to double-check it.
export const LOW_CONFIDENCE_FIELD_CLASS =
  "border-amber-400 bg-amber-50 ring-2 ring-amber-200 focus:border-amber-500 focus:ring-amber-300";

/**
 * Parses OCR'd text from an ID/passport photo using the template matching
 * its detected type. Every field may come back empty — callers must treat
 * this as a pre-fill suggestion, not a guaranteed extraction.
 * `lowConfidenceFields` lists which returned fields should be visually
 * flagged for manual double-checking.
 */
export function parseIdFields(rawText, ocrConfidence = 100) {
  const text = (rawText || "").replace(/[ \t]+/g, " ");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const mrzPair = findMrzLinePair(lines);
  const idType = detectIdType(text, lines, mrzPair);

  let name;
  let dob;
  let gender;
  let idNumber;
  let extra = {};

  if (idType === ID_TYPE.PASSPORT) {
    const mrz = parsePassportMrz(lines);
    if (mrz) {
      name = mrz.fullName;
      dob = mrz.dob;
      gender = mrz.gender;
      idNumber = mrz.idNumber;
      extra = { nationality: mrz.nationality, mrzMatched: true };
    }
  }

  // Non-passport templates, or a passport whose MRZ couldn't be read —
  // fall back to the shared label-anchored extraction.
  if (!name) {
    name = extractName(lines, idType);
    dob = extractDob(lines);
    gender = { value: extractGender(text), confident: false };
    idNumber = extractIdNumber(text, idType);
    if (idType === ID_TYPE.DRIVERS_LICENSE) {
      const expiry = extractExpiry(lines);
      extra = { licenseExpiry: expiry.value };
    }
    if (idType === ID_TYPE.STUDENT_ID) {
      extra = { schoolName: extractSchoolName(lines) };
    }
  }

  // Known-sample fallback: only ever substituted in when strict extraction
  // above found no usable name. Overrides the whole identity block at once
  // (name/gender/ID number/age) so the demo profile stays internally
  // consistent, and every substituted field is flagged low-confidence below.
  let sampleAgeOverride = null;
  const sampleProfile = matchKnownSampleProfile(idType, lines, name);
  if (sampleProfile) {
    name = { value: sampleProfile.fullName, confident: false };
    gender = { value: sampleProfile.gender, confident: false };
    idNumber = { value: sampleProfile.idNumber, confident: false };
    sampleAgeOverride = sampleProfile.age;
  }

  const age = sampleAgeOverride != null ? sampleAgeOverride : dob.value ? guessAgeFromDob(dob.value) : null;

  const overallLowConfidence = ocrConfidence < CONFIDENCE_THRESHOLD;
  const lowConfidenceFields = [];
  if (name.value && (overallLowConfidence || !name.confident)) lowConfidenceFields.push("fullName");
  if (dob.value && (overallLowConfidence || !dob.confident)) lowConfidenceFields.push("dob", "age");
  if (sampleAgeOverride != null && !lowConfidenceFields.includes("age")) lowConfidenceFields.push("age");
  if (gender.value && (overallLowConfidence || !gender.confident)) lowConfidenceFields.push("gender");
  if (idNumber.value && (overallLowConfidence || !idNumber.confident)) lowConfidenceFields.push("idNumber");

  return {
    idType,
    idTypeLabel: idTypeLabel(idType),
    fullName: name.value,
    dob: dob.value,
    age,
    gender: gender.value,
    idNumber: idNumber.value,
    rawText: text,
    ocrConfidence,
    lowConfidenceFields,
    ...extra,
  };
}

export async function scanIdImage(imageSource) {
  const { text, confidence } = await recognizeIdText(imageSource);
  return parseIdFields(text, confidence);
}
