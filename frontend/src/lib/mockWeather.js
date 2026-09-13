const CONDITIONS = ["Sunny", "Partly Cloudy", "Clear Skies"];

// Deterministic per day/hour so it feels "live" without being flaky —
// no external weather API is wired up, this is presentational only.
export function getMockWeather(date = new Date()) {
  const hour = date.getHours();
  const dayIndex = date.getDate();
  const baseTemp = 27 + Math.round(4 * Math.sin(((hour - 6) / 24) * Math.PI * 2));
  const tempC = Math.max(24, Math.min(33, baseTemp + 3));
  const condition = CONDITIONS[dayIndex % CONDITIONS.length];
  return { condition, tempC };
}
