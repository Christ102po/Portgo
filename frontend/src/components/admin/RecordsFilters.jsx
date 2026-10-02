import { Search, X } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export const EMPTY_RECORDS_FILTERS = {
  search: "",
  date: "",
  shipId: "",
};

export function RecordsFilters({ filters, onChange, ships }) {
  const set = (field, value) => onChange({ ...filters, [field]: value });
  const shipOptions = [
    { value: "ALL", label: "All Ships" },
    ...ships.map((ship) => ({ value: ship.id, label: ship.name })),
  ];
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_220px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="h-11 pl-9" placeholder="Search passenger name" value={filters.search} onChange={(e) => set("search", e.target.value)} />
        </div>
        <Input className="h-11" type="date" value={filters.date} onChange={(e) => set("date", e.target.value)} title="Registration date" />
        <Select className="h-11" value={filters.shipId || "ALL"} onValueChange={(value) => set("shipId", value === "ALL" ? "" : value)} options={shipOptions} />
        {hasFilters && (
          <button type="button" onClick={() => onChange({ ...EMPTY_RECORDS_FILTERS })} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
