import { Download, Printer, Inbox, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function genderLabel(value) {
  if (!value) return "—";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function RecordsTable({ rows, total, isLoading, onExport, isExporting, onDeletePassenger }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 print:hidden">
        <p className="text-sm font-semibold text-slate-700">{total} record{total === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport} disabled={isExporting}>
            <Download className="h-3.5 w-3.5" /> {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Ship Boarded</th>
              <th className="px-4 py-3">Pass Number</th>
              <th className="px-4 py-3">Registered At</th>
              <th className="px-4 py-3 text-right print:hidden">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="border-b border-slate-100">
                {Array.from({ length: 8 }).map((__, cell) => <td key={cell} className="px-4 py-4"><Skeleton className="h-4 w-full" /></td>)}
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-16 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><Inbox className="h-6 w-6 text-slate-400" /></div>
                  <p className="text-sm font-bold text-slate-700">No passenger records found</p>
                  <p className="text-xs text-slate-400">New registrations will appear here automatically.</p>
                </div>
              </td></tr>
            )}
            {!isLoading && rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-4 font-semibold text-slate-900">{row.passenger?.fullName || "—"}</td>
                <td className="px-4 py-4 text-slate-600">{row.passenger?.age ?? "—"}</td>
                <td className="px-4 py-4 text-slate-600">{genderLabel(row.passenger?.gender)}</td>
                <td className="max-w-[260px] px-4 py-4 text-slate-600">{row.passenger?.address || "—"}</td>
                <td className="px-4 py-4 font-medium text-slate-700">{row.ship?.name || "—"}</td>
                <td className="px-4 py-4 text-slate-600">{row.passNumber || "—"}</td>
                <td className="px-4 py-4 text-xs text-slate-500">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-4 text-right print:hidden">
                  <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => onDeletePassenger(row)} title="Delete passenger record">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
