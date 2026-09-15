export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "tl", label: "Tagalog" },
  { code: "ceb", label: "Bisaya" },
];

const STRINGS = {
  kioskTitle: {
    en: "PORTGO Passenger Kiosk Terminal",
    tl: "Terminal ng Kiosk ng Pasahero ng PORTGO",
    ceb: "PORTGO Terminal sa Kiosk sa Pasahero",
  },
  pageTitle: {
    en: "Passenger Registration",
    tl: "Pagpaparehistro ng Pasahero",
    ceb: "Pagrehistro sa Pasahero",
  },
  pageSubtitle: {
    en: "Surigao – Dapa Port Passenger Monitoring",
    tl: "Pagsubaybay sa Pasahero ng Daungan ng Surigao – Dapa",
    ceb: "Pagbantay sa Pasahero sa Pantalan sa Surigao – Dapa",
  },
  findPass: {
    en: "Find My Pass / Reprint",
    tl: "Hanapin ang Aking Pass / I-reprint",
    ceb: "Pangitaa ang Akong Pass / I-print Usab",
  },
  registerMyself: { en: "Register Myself", tl: "Irehistro ang Sarili", ceb: "Irehistro ang Kaugalingon" },
  registerGroup: {
    en: "Register Group / Dependents",
    tl: "Irehistro ang Grupo / Dependents",
    ceb: "Irehistro ang Grupo / mga Dependent",
  },
  passengerTypeQuestion: {
    en: "Which best describes you?",
    tl: "Alin ang naglalarawan sa iyo?",
    ceb: "Hain ang naghulagway kanimo?",
  },
  passengerTypeSubtitleIndividual: {
    en: "Select the option that best describes you.",
    tl: "Piliin ang pagpipiliang naaangkop sa iyo.",
    ceb: "Pilia ang kapilian nga angay kanimo.",
  },
  passengerTypeSubtitleGroup: {
    en: "Select the passenger type that applies to your whole group.",
    tl: "Piliin ang uri ng pasahero na naaangkop sa buong grupo.",
    ceb: "Pilia ang matang sa pasahero nga angay sa tibuok ninyong grupo.",
  },
  localResident: { en: "Local Resident", tl: "Lokal na Residente", ceb: "Lokal nga Residente" },
  localResidentDescription: {
    en: "Resident of Surigao or Siargao.",
    tl: "Residente ng Surigao o Siargao.",
    ceb: "Residente sa Surigao o Siargao.",
  },
  touristCategory: { en: "Tourist", tl: "Turista", ceb: "Turista" },
  touristCategoryDescription: {
    en: "Visitor or traveler — domestic or foreign.",
    tl: "Bisita o manlalakbay — lokal man o dayuhan.",
    ceb: "Bisita o magbibiyahe — lokal man o langyaw.",
  },
  localTourist: { en: "Philippine Tourist (Domestic)", tl: "Lokal na Turista", ceb: "Lokal nga Turista" },
  localTouristDescription: {
    en: "Visiting from elsewhere in the Philippines. Requires a Valid ID or Student ID.",
    tl: "Bisita mula sa ibang bahagi ng Pilipinas. Kailangan ng Valid ID o Student ID.",
    ceb: "Bisita gikan sa ubang bahin sa Pilipinas. Kinahanglan og Valid ID o Student ID.",
  },
  foreignTourist: { en: "Foreign Tourist", tl: "Dayuhang Turista", ceb: "Langyaw nga Turista" },
  foreignTouristDescription: {
    en: "Visiting from abroad. A passport number and photo are required.",
    tl: "Bisita mula sa ibang bansa. Kailangan ng numero at larawan ng pasaporte.",
    ceb: "Bisita gikan sa gawas sa nasod. Kinahanglan ang numero ug litrato sa pasaporte.",
  },
  selected: { en: "Selected", tl: "Napili", ceb: "Napili" },
  continue: { en: "Continue", tl: "Magpatuloy", ceb: "Padayon" },
  back: { en: "Back", tl: "Bumalik", ceb: "Balik" },
  transactionQuestion: {
    en: "Are you departing or arriving?",
    tl: "Aalis ka ba o darating?",
    ceb: "Manggula ka ba o moabot?",
  },
  transactionSubtitle: {
    en: "Choose your trip direction at {port} Port.",
    tl: "Piliin ang direksyon ng iyong biyahe sa Daungan ng {port}.",
    ceb: "Pilia ang direksyon sa imong biyahe sa Pantalan sa {port}.",
  },
  signIn: {
    en: "Outbound Passenger (Departing)",
    tl: "Papaalis na Pasahero (Aalis)",
    ceb: "Papahawa nga Pasahero (Manggula)",
  },
  signInDescription: {
    en: "Sign Out — Leaving {port} to travel to {destination}.",
    tl: "Sign Out — Aalis sa {port} patungong {destination}.",
    ceb: "Sign Out — Manggula sa {port} padulong sa {destination}.",
  },
  signOut: {
    en: "Inbound Passenger (Arriving)",
    tl: "Dumarating na Pasahero (Paparating)",
    ceb: "Nag-abot nga Pasahero (Moabot)",
  },
  signOutDescription: {
    en: "Sign In — Arriving at {port}, coming from {destination}.",
    tl: "Sign In — Darating sa {port}, mula sa {destination}.",
    ceb: "Sign In — Moabot sa {port}, gikan sa {destination}.",
  },
  seaSmooth: { en: "Smooth Sailing", tl: "Maayos na Paglalayag", ceb: "Hapsay nga Paglawig" },
  seaChoppy: { en: "Choppy Waters", tl: "Magulong Dagat", ceb: "Kusog nga Balud" },
  seaSuspended: { en: "Trips Suspended", tl: "Suspendido ang mga Biyahe", ceb: "Gisuspinde ang mga Biyahe" },
};

const KEY = "portgo_language";
const EVENT = "portgo-language-change";

export function getLanguage() {
  return localStorage.getItem(KEY) || "en";
}

export function setLanguage(code) {
  localStorage.setItem(KEY, code);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeLanguage(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function translate(key, lang, vars) {
  const entry = STRINGS[key];
  if (!entry) return key;
  const raw = entry[lang] || entry.en || key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match
  );
}
