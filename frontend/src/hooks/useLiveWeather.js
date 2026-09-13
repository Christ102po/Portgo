import { useEffect, useState } from "react";
import { apiClient } from "../lib/apiClient";
import { getMockWeather } from "../lib/mockWeather";

const POLL_MS = 5 * 60 * 1000; // 5 minutes — weather doesn't need to be any fresher than that

function localFallback() {
  const mock = getMockWeather();
  return { tempC: mock.tempC, condition: mock.condition, windKph: null, seaCondition: "Calm Seas", isSevere: false, source: "offline" };
}

// Live weather for the Surigao <-> Dapa strait (see backend/src/lib/weather.js).
// The server already falls back to a simulated feed when no API key is
// configured; this hook adds one more layer of resilience purely for
// network failures (kiosk offline, backend unreachable) so the widget
// never shows nothing.
export function useLiveWeather() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      apiClient
        .get("/weather")
        .then((res) => {
          if (!cancelled) setWeather(res.data.weather);
        })
        .catch(() => {
          if (!cancelled) setWeather((prev) => prev || localFallback());
        });
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return weather;
}
