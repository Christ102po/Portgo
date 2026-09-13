// Live weather for the Surigao <-> Dapa strait, used to drive the kiosk's
// weather widget and the Gale Warning escalation on the Sea Condition
// badge. Falls back to a deterministic simulated feed when no
// OPENWEATHER_API_KEY is configured (or the live call fails) so the widget
// always has something sensible to show — see simulateWeather() below.

const SURIGAO_COORDS = { lat: 9.7833, lon: 125.4906 };
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

// OpenWeatherMap condition-code groups that correspond to PAGASA-relevant
// hazardous sea weather: thunderstorms, heavy/violent/freezing rain, squalls,
// and tornadoes. https://openweathermap.org/weather-conditions
const SEVERE_WEATHER_IDS = new Set([
  200, 201, 202, 210, 211, 212, 221, 230, 231, 232, // thunderstorm
  502, 503, 504, 511, 522, // heavy / violent / freezing / shower rain
  771, // squall
  781, // tornado
]);

// Rough PAGASA-style gale threshold — sustained wind at/above this is
// treated as gale-force for the badge, independent of the reported
// condition text.
const GALE_WIND_KPH = 39;
const MODERATE_WIND_KPH = 25;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes — avoid hammering the API
let cache = { at: 0, data: null };

function deriveSeaCondition({ windKph, weatherId }) {
  const isSevere = windKph >= GALE_WIND_KPH || SEVERE_WEATHER_IDS.has(weatherId);
  const seaCondition = isSevere ? "Rough Seas" : windKph >= MODERATE_WIND_KPH ? "Moderate Seas" : "Calm Seas";
  return { isSevere, seaCondition };
}

function toTitleCase(s) {
  return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchLiveWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `${OPENWEATHER_URL}?lat=${SURIGAO_COORDS.lat}&lon=${SURIGAO_COORDS.lon}&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const tempC = Math.round(data.main?.temp);
    const windKph = Math.round((data.wind?.speed || 0) * 3.6);
    const weatherId = data.weather?.[0]?.id;
    const condition = toTitleCase(data.weather?.[0]?.description || "Clear Skies");
    const { isSevere, seaCondition } = deriveSeaCondition({ windKph, weatherId });

    return { tempC, condition, windKph, seaCondition, isSevere, source: "live" };
  } catch {
    return null;
  }
}

// Deterministic per hour/day so the widget still feels "live" without a
// real API key — mirrors the existing frontend mock weather look-and-feel
// (calm, warm, coastal) rather than randomly alarming operators who simply
// haven't configured an API key yet.
function simulateWeather(date = new Date()) {
  const CONDITIONS = ["Sunny", "Partly Cloudy", "Clear Skies"];
  const hour = date.getHours();
  const dayIndex = date.getDate();
  const baseTemp = 27 + Math.round(4 * Math.sin(((hour - 6) / 24) * Math.PI * 2));
  const tempC = Math.max(24, Math.min(33, baseTemp + 3));
  const condition = CONDITIONS[dayIndex % CONDITIONS.length];
  const windKph = 12 + (dayIndex % 8); // gentle coastal breeze, never severe
  const { isSevere, seaCondition } = deriveSeaCondition({ windKph, weatherId: null });

  return { tempC, condition, windKph, seaCondition, isSevere, source: "simulated" };
}

async function getWeather() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_TTL_MS) return cache.data;

  const live = await fetchLiveWeather();
  const data = live || simulateWeather();
  cache = { at: now, data };
  return data;
}

module.exports = { getWeather, deriveSeaCondition, GALE_WIND_KPH, MODERATE_WIND_KPH };
