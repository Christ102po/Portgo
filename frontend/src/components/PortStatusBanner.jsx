import { CloudLightning, CloudSun, Ban } from "lucide-react";
import { usePortAdvisory } from "../hooks/usePortAdvisory";
import { cn } from "../lib/cn";

export function PortStatusBanner({ className }) {
  const advisory = usePortAdvisory();

  if (!advisory) return null;
  const isSuspended = advisory.suspended;
  const isGale = advisory.active;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 sm:px-8 print:hidden",
        isSuspended ? "bg-red-700 text-white" : isGale ? "bg-red-600 text-white" : "bg-emerald-600 text-white",
        className
      )}
    >
      {isSuspended ? (
        <Ban className="h-4.5 w-4.5 shrink-0 animate-pulse" />
      ) : isGale ? (
        <CloudLightning className="h-4.5 w-4.5 shrink-0 animate-pulse" />
      ) : (
        <CloudSun className="h-4.5 w-4.5 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold sm:text-sm">
          {isSuspended
            ? "PORT NOTICE: All passenger trips are currently suspended due to Coast Guard Weather Advisory."
            : isGale
            ? "Coast Guard Gale Warning: Trips Suspended"
            : "Sea State: Normal — Clear Sailing"}
        </p>
        {isSuspended && advisory.suspendedReason && (
          <p className="truncate text-[11px] text-white/90">{advisory.suspendedReason}</p>
        )}
        {!isSuspended && isGale && advisory.message && (
          <p className="truncate text-[11px] text-white/90">{advisory.message}</p>
        )}
      </div>
    </div>
  );
}
