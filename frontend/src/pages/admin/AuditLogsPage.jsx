import { useEffect, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { Pagination } from "../../components/admin/Pagination";
import { apiClient } from "../../lib/apiClient";

const PAGE_SIZE = 20;

const ACTION_COLORS = {
  ADMIN_LOGIN: "text-slate-500",
  TRIP_CANCELLED: "text-red-600",
  TRIP_NO_SHOW: "text-amber-600",
  TRIP_BOARDED: "text-emerald-600",
  TRIP_REBOOKED: "text-graphite",
  SCHEDULE_CANCELLED: "text-red-600",
  SCHEDULE_DELAYED: "text-amber-600",
  SCHEDULE_MAINTENANCE: "text-amber-600",
  BULK_SCHEDULE_CANCEL: "text-red-600",
  ADVISORY_ACTIVATED: "text-red-600",
};

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[160px]" />
        </td>
      ))}
    </tr>
  );
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      apiClient
        .get("/audit-logs", { params: { search: search || undefined, page, pageSize: PAGE_SIZE } })
        .then((res) => {
          setRows(res.data.rows);
          setTotal(res.data.total);
        })
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, page]);

  return (
    <div>
      <header className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-graphite" />
        <div>
          <h1 className="text-2xl font-bold text-graphite">Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-500">A record of every administrative action taken in PORTGO.</p>
        </div>
      </header>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search action, admin, or details"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-surface text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No audit log entries found.
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((log) => (
                <tr key={log.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-surface">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{log.adminName || "System"}</p>
                    <p className="text-xs text-slate-400">{log.adminEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${ACTION_COLORS[log.action] || "text-slate-600"}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{log.details}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
