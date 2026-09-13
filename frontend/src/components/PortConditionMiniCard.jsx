import { Sun, Cloud, CloudSun, CloudRain, CloudLightning, Wind, Waves } from "lucide-react";
import { usePortAdvisory } from "../hooks/usePortAdvisory";
import { useLiveWeather } from "../hooks/useLiveWeather";
import { useLanguage } from "../hooks/useLanguage";
import { cn } from "../lib/cn";

const WEATHER_ICONS = {
  Sunny: Sun,
  "Partly Cloudy": CloudSun,
  "Clear Skies": Cloud,
};

function weatherIconFor(condition) {
  if (WEATHER_ICONS[condition]) return WEATHER_ICONS[condition];
  const lower = (condition || "").toLowerCase();
  if (lower.includes("thunder") || lower.includes("storm")) return CloudLightning;
  if (lower.includes("rain") || lower.includes("drizzle")) return CloudRain;
  if (lower.includes("wind") || lower.includes("squall")) return Wind;
  if (lower.includes("cloud")) return CloudSun;
  return Sun;
}

export function PortConditionMiniCard({ className }) {
  const advisory = usePortAdvisory();
  const weather = useLiveWeather();
  const { t } = useLanguage();
  const WeatherIcon = weatherIconFor(weather?.condition);

  const isSuspended = advisory?.suspended;
  // Gale styling escalates from either an admin-declared advisory OR live
  // weather crossing the gale threshold — see backend/src/lib/weather.js.
  // Only the admin-set `suspended` flag actually blocks bookings; live
  // weather alone never auto-suspends travel, it just surfaces the warning.
  const isGale = advisory?.active || weather?.isSevere;
  const isWarning = isSuspended || isGale;
  const seaLabel = isSuspended ? t("seaSuspended") : isGale ? t("seaChoppy") : t("seaSmooth");

  return (
    <div
      className={cn(
        "mx-auto inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-soft backdrop-blur-sm",
        className
      )}
    >
      <span className={cn("flex items-center gap-1.5", isWarning ? "text-amber-600" : "text-emerald-600")}>
        <Waves className="h-3.5 w-3.5" />
        Surigao &ndash; Dapa: {seaLabel}
      </span>
      <span className="text-slate-300">&bull;</span>
      <span className="flex items-center gap-1.5 text-slate-500">
        <WeatherIcon className="h-3.5 w-3.5" />
        {weather ? `${weather.condition} ${weather.tempC}°C` : "Loading weather..."}
      </span>
    </div>
  );
}
