import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  PhoneCall,
  ScanLine,
  CloudLightning,
  Ban,
  XCircle,
  UserX,
  CalendarClock,
  LogIn,
  ShieldAlert,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { cn } from "../../lib/cn";

const ACTION_META = {
  OTP_SENT: { icon: PhoneCall, className: "bg-blue-50 text-blue-600" },
  OTP_VERIFIED: { icon: PhoneCall, className: "bg-emerald-50 text-emerald-600" },
  OTP_VERIFY_FAILED: { icon: PhoneCall, className: "bg-red-50 text-red-600" },
  GATE_SCAN: { icon: ScanLine, className: "bg-emerald-50 text-emerald-600" },
  WATCHLIST_ALERT: { icon: ShieldAlert, className: "bg-red-50 text-red-600" },
  ADVISORY_ACTIVATED: { icon: CloudLightning, className: "bg-amber-50 text-amber-600" },
  ADVISORY_CLEARED: { icon: CloudLightning, className: "bg-emerald-50 text-emerald-600" },
  OPERATIONS_SUSPENDED: { icon: Ban, className: "bg-red-50 text-red-600" },
  OPERATIONS_RESUMED: { icon: Ban, className: "bg-emerald-50 text-emerald-600" },
  TRIP_CANCELLED: { icon: XCircle, className: "bg-red-50 text-red-600" },
  TRIP_NO_SHOW: { icon: UserX, className: "bg-amber-50 text-amber-600" },
  TRIP_REBOOKED: { icon: CalendarClock, className: "bg-slate-100 text-slate-600" },
  ADMIN_LOGIN: { icon: LogIn, className: "bg-slate-100 text-slate-600" },
};

const DEFAULT_META = { icon: Activity, className: "bg-slate-100 text-slate-600" };

function formatExactTime(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function RecentActivityPanel() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    function load() {
      apiClient
        .get("/audit-logs", { params: { pageSize: 8 } })
        .then((res) => setRows(res.data.rows))
        .finally(() => setIsLoading(false));
    }
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-graphite" />
          <p className="text-sm font-bold text-graphite">Recent System Activity</p>
        </div>
        <Link to="/admin/audit-logs" className="text-xs font-semibold text-graphite hover:underline">
          View All Audit Logs
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        {!isLoading && rows.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No recent activity.</p>
        )}
        {!isLoading &&
          rows.map((row) => {
            const meta = ACTION_META[row.action] || DEFAULT_META;
            const Icon = meta.icon;
            return (
              <div key={row.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.className)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {row.details || row.action.replace(/_/g, " ")}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {row.action.replace(/_/g, " ")} &middot; {formatExactTime(row.createdAt)}
                    {row.adminName ? ` · ${row.adminName}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
