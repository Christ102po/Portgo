import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, WifiOff } from "lucide-react";
import { WeatherAdvisoryControl } from "./WeatherAdvisoryControl";
import { OperationStatusToggle } from "./OperationStatusToggle";
import { ConnectivityBadge } from "../ConnectivityBadge";
import { Switch } from "../ui/Switch";
import { cn } from "../../lib/cn";
import { isForcedOffline, setForcedOffline, subscribeForcedOffline } from "../../lib/offlineSimulation";
import { ApkDownloadButton } from "../ApkDownloadButton";

const TITLES = {
  "/admin": "Dashboard",
  "/admin/records": "Passenger Records",
  "/admin/manifest": "Manifest Inspection",
  "/admin/barangay-masterlist": "Barangay Masterlist",
  "/admin/ticketing": "Ticketing Desk",
  "/admin/gate-scanner": "Gate Scanner",
  "/admin/reports": "Reports & Analytics",
  "/admin/ships": "Ships",
  "/admin/schedules": "Schedules",
  "/admin/vehicles": "Vehicles & Cargo",
  "/admin/audit-logs": "Audit Logs",
  "/admin/watchlist": "Security Watchlist",
  "/admin/staff": "Manage Staff",
};

function OfflineModeToggle() {
  const [forced, setForced] = useState(() => isForcedOffline());

  useEffect(() => {
    const unsubscribe = subscribeForcedOffline(() => setForced(isForcedOffline()));
    return unsubscribe;
  }, []);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        forced ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500"
      )}
      title="Simulates a dropped connection so registrations queue locally for testing"
    >
      <WifiOff className="h-3.5 w-3.5" />
      Test Offline Mode
      <Switch checked={forced} onCheckedChange={(v) => setForcedOffline(v)} />
    </div>
  );
}

function ToolbarControls({ now, compact = false }) {
  return (
    <div className={cn("flex items-center gap-2", compact && "min-w-max")}> 
      <OperationStatusToggle />
      <WeatherAdvisoryControl />
      <OfflineModeToggle />
      <ConnectivityBadge />
      <ApkDownloadButton compact />
      {!compact && (
        <span className="hidden shrink-0 text-xs font-medium text-slate-500 xl:inline">
          {now.toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}

export function Topbar({ onMenuClick }) {
  const location = useLocation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const title = TITLES[location.pathname] || "PORTGO Admin";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
      <div className="flex min-h-16 items-center gap-3 px-3 sm:px-5 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-graphite sm:text-base">{title}</p>
          <p className="truncate text-[11px] text-slate-400 lg:hidden">
            {now.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="hidden min-w-0 lg:block">
          <ToolbarControls now={now} />
        </div>
      </div>

      <div className="overflow-x-auto border-t border-slate-100 px-3 py-2 scrollbar-hide sm:px-5 lg:hidden">
        <ToolbarControls now={now} compact />
      </div>
    </header>
  );
}
