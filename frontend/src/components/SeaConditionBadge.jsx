import { CloudSun, CloudLightning, Ban } from "lucide-react";
import { usePortAdvisory } from "../hooks/usePortAdvisory";
import { useLiveWeather } from "../hooks/useLiveWeather";
import { cn } from "../lib/cn";

export function SeaConditionBadge() {
  const advisory = usePortAdvisory();
  const weather = useLiveWeather();
  if (!advisory) return null;

  const isSuspended = advisory.suspended;
  // Gale styling triggers from either an admin-declared advisory OR live
  // weather (wind speed / storm conditions) crossing the gale threshold —
  // see backend/src/lib/weather.js. Only the admin-set `suspended` flag
  // actually blocks bookings; a weather-triggered gale warning is purely
  // informational until a port officer confirms it.
  const isWeatherGale = !!weather?.isSevere;
  const isGale = advisory.active || isWeatherGale;
  const isWarning = isSuspended || isGale;

  const label = isSuspended
    ? "Trips Suspended"
    : isGale
    ? "Gale Warning"
    : "Normal Sea Condition";
  const Icon = isSuspended ? Ban : isGale ? CloudLightning : CloudSun;
  const title = isSuspended
    ? advisory.suspendedReason || label
    : advisory.active
    ? advisory.message || label
    : isWeatherGale
    ? `Live weather: ${weather.condition}, wind ${weather.windKph} kph — Sea Travel Advisory`
    : label;

  return (
    <span
      title={title}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs",
        isSuspended
          ? "bg-red-400/15 text-red-300 ring-1 ring-red-400/30"
          : isGale
          ? "bg-orange-400/15 text-orange-300 ring-1 ring-orange-400/30"
          : "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
      )}
    >
      <Icon className={cn("h-3 w-3", isWarning && "animate-pulse")} />
      {label}
    </span>
  );
}
