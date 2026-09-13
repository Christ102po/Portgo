import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ship as ShipIcon, FileText } from "lucide-react";
import { Button } from "../ui/Button";
import { apiClient } from "../../lib/apiClient";
import { routeLabel } from "../../lib/route";
import { cn } from "../../lib/cn";

export function VesselCapacityStats({ onViewManifest }) {
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/schedules").then((res) => {
      setSchedules(res.data.schedules.slice(0, 8));
      setIsLoading(false);
    });
  }, []);

  if (!isLoading && schedules.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Vessel Capacity &amp; Trip Statistics &middot; Currently Active Sailings
        </p>
        <Link to="/admin/schedules" className="text-xs font-semibold text-graphite hover:underline">
          Manage Schedules
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[188px] w-72 shrink-0 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
          ))}
        {!isLoading &&
          schedules.map((s) => {
            const pct = s.capacity ? Math.min(100, Math.round((s.bookedCount / s.capacity) * 100)) : 0;
            return (
              <div key={s.id} className="w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold text-graphite">
                    <ShipIcon className="h-4 w-4 shrink-0 text-slate-400" />
                    {s.ship.name}
                  </p>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-400">{s.departureTime}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{routeLabel(s.route)}</p>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      s.isFull ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-graphite">{s.bookedCount}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{s.boardedCount}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Checked-In</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">{s.pendingCount}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Pending</p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
                  {s.seatsLeft} of {s.capacity} seats remaining
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  onClick={() => onViewManifest(s.id)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Export Manifest (PDF)
                </Button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
