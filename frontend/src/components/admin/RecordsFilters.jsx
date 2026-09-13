import { Search, X, Banknote } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { cn } from "../../lib/cn";
import { tripStatusBadge } from "../../lib/tripStatus";
import { passengerTypeLabel } from "../../lib/verification";

const PASSENGER_TYPE_TABS = [
  { value: "ALL", label: "All" },
  { value: "LOCAL_RESIDENT", label: "Local Resident" },
  { value: "LOCAL_TOURIST", label: "Local Tourist" },
  { value: "FOREIGN_TOURIST", label: "Foreign Tourist" },
];

const PERIOD_OPTIONS = [
  { value: "", label: "Any Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

const TRANSACTION_TYPE_OPTIONS = [
  { value: "ALL", label: "All Transactions" },
  { value: "SIGN_IN", label: "Outbound · Departing" },
  { value: "SIGN_OUT", label: "Inbound · Arriving" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "BOARDED", label: "Boarded" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-Show" },
  { value: "REBOOKED", label: "Rebooked" },
];

const PRIORITY_OPTIONS = [
  { value: "ALL", label: "Any Passenger" },
  { value: "MEDICAL", label: "Medical Emergency" },
  { value: "SENIOR", label: "Senior Citizen" },
  { value: "PWD", label: "PWD" },
  { value: "PREGNANT", label: "Pregnant" },
  { value: "WHEELCHAIR", label: "Wheelchair" },
  { value: "STUDENT", label: "Student" },
  { value: "INFANT", label: "Infant" },
  { value: "MINOR", label: "Minor (Under 18)" },
];

const PRIORITY_LABELS = Object.fromEntries(PRIORITY_OPTIONS.map((p) => [p.value, p.label]));

const PERIOD_LABELS = { today: "Today", week: "This Week", month: "This Month", year: "This Year" };

const CHIP_LABELS = {
  search: (v) => `"${v}"`,
  date: (v) => v,
  range: (v) => PERIOD_LABELS[v] || v,
  shipId: (v, ships) => ships.find((s) => s.id === v)?.name || v,
  passengerType: (v) => passengerTypeLabel(v),
  transactionType: (v) => (v === "SIGN_IN" ? "Outbound · Departing" : "Inbound · Arriving"),
  status: (v) => tripStatusBadge(v).label,
  priority: (v) => PRIORITY_LABELS[v] || v,
  refundRequested: () => "Refund Pending",
};

export const EMPTY_RECORDS_FILTERS = {
  search: "",
  date: "",
  range: "",
  shipId: "",
  passengerType: "",
  transactionType: "",
  status: "",
  priority: "",
  refundRequested: "",
};

export function RecordsFilters({ filters, onChange, ships }) {
  function set(field, value) {
    onChange({ ...filters, [field]: value });
  }

  function clear(field) {
    onChange({ ...filters, [field]: "" });
  }

  function setPeriod(value) {
    onChange({ ...filters, range: value, date: "" });
  }

  function setExactDate(value) {
    onChange({ ...filters, date: value, range: "" });
  }

  const shipOptions = [
    { value: "ALL", label: "All Ships" },
    ...ships.map((s) => ({ value: s.id, label: s.name })),
  ];

  const activeChips = Object.entries(filters).filter(([, v]) => v);

  return (
    <div className="mb-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
          {PASSENGER_TYPE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => set("passengerType", t.value === "ALL" ? "" : t.value)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-150",
                (filters.passengerType || "ALL") === t.value
                  ? "bg-slate-900 text-emerald-400 shadow-soft"
                  : "text-slate-500 hover:text-graphite"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value || "any"}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
                (filters.range || "") === p.value
                  ? "bg-slate-900 text-emerald-400 shadow-soft"
                  : "text-slate-500 hover:text-graphite"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-10 pl-9 focus:border-emerald-400 focus:ring-emerald-500/20"
            placeholder="Search name, phone, or passport"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>
        <Input
          className="h-10 focus:border-emerald-400 focus:ring-emerald-500/20"
          type="date"
          value={filters.date}
          onChange={(e) => setExactDate(e.target.value)}
          title="Exact date"
        />
        <Select
          className="h-10 focus:border-emerald-400 focus:ring-emerald-500/20"
          value={filters.shipId || "ALL"}
          onValueChange={(v) => set("shipId", v === "ALL" ? "" : v)}
          options={shipOptions}
        />
        <Select
          className="h-10 focus:border-emerald-400 focus:ring-emerald-500/20"
          value={filters.transactionType || "ALL"}
          onValueChange={(v) => set("transactionType", v === "ALL" ? "" : v)}
          options={TRANSACTION_TYPE_OPTIONS}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Select
          value={filters.status || "ALL"}
          onValueChange={(v) => set("status", v === "ALL" ? "" : v)}
          options={STATUS_OPTIONS}
          className="h-10 w-44 focus:border-emerald-400 focus:ring-emerald-500/20"
        />
        <Select
          value={filters.priority || "ALL"}
          onValueChange={(v) => set("priority", v === "ALL" ? "" : v)}
          options={PRIORITY_OPTIONS}
          className="h-10 w-48 focus:border-emerald-400 focus:ring-emerald-500/20"
        />
        <button
          type="button"
          onClick={() => set("refundRequested", filters.refundRequested ? "" : "true")}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors",
            filters.refundRequested
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-200 text-slate-500 hover:border-slate-300"
          )}
        >
          <Banknote className="h-3.5 w-3.5" />
          Refund Pending Only
        </button>
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeChips.map(([field, value]) => (
              <button
                key={field}
                onClick={() => clear(field)}
                className="inline-flex items-center gap-1 rounded-full bg-graphite/5 px-2.5 py-1 text-xs font-medium text-graphite transition-colors hover:bg-graphite/10"
              >
                {CHIP_LABELS[field] ? CHIP_LABELS[field](value, ships) : value}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              onClick={() => onChange({ ...EMPTY_RECORDS_FILTERS })}
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
