import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { WeatherAdvisoryControl } from "./WeatherAdvisoryControl";
import { OperationStatusToggle } from "./OperationStatusToggle";
import { ConnectivityBadge } from "../ConnectivityBadge";
import { Switch } from "../ui/Switch";
import { cn } from "../../lib/cn";
import { isForcedOffline, setForcedOffline, subscribeForcedOffline } from "../../lib/offlineSimulation";

const TITLES = {
  "/admin": "Dashboard",
  "/admin/records": "Passenger Records",
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
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        forced ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500"
      )}
      title="Simulates a dropped connection so registrations queue locally for testing"
    >
      <WifiOff className="h-3.5 w-3.5" />
      Test Offline Mode
      <Switch checked={forced} onCheckedChange={(v) => setForcedOffline(v)} />
    </div>
  );
}

export function Topbar() {
  const location = useLocation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const title = TITLES[location.pathname] || "PORTGO Admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-8 backdrop-blur-md">
      <p className="text-sm font-semibold text-graphite">{title}</p>
      <div className="flex items-center gap-4">
        <OperationStatusToggle />
        <WeatherAdvisoryControl />
        <OfflineModeToggle />
        <ConnectivityBadge />
        <span className="text-xs font-medium text-slate-500">
          {now.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </header>
  );
}
