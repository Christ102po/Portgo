import { Search, X } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { ACCOMMODATION_CLASSES } from "../../lib/accommodationClass";
import { routeLabel } from "../../lib/route";

const DIRECTION_OPTIONS = [
  { value: "ALL", label: "All Directions" },
  { value: "SIGN_IN", label: "Outbound · Departing" },
  { value: "SIGN_OUT", label: "Inbound · Arriving" },
];

const CLASS_OPTIONS = [
  { value: "ALL", label: "All Classes" },
  ...ACCOMMODATION_CLASSES.map((c) => ({ value: c.value, label: c.label })),
];

export const EMPTY_MANIFEST_FILTERS = {
  search: "",
  date: "",
  shipId: "",
  scheduleId: "",
  transactionType: "",
  accommodationClass: "",
};

export function ManifestFilters({ filters, onChange, ships, schedules }) {
  function set(field, value) {
    const next = { ...filters, [field]: value };
    // Changing the vessel invalidates whichever schedule was picked for the
    // previous one.
    if (field === "shipId") next.scheduleId = "";
    onChange(next);
  }

  function clear(field) {
    onChange({ ...filters, [field]: "" });
  }

  const shipOptions = [{ value: "ALL", label: "All Vessels" }, ...ships.map((s) => ({ value: s.id, label: s.name }))];

  const scheduleOptions = [
    { value: "ALL", label: filters.shipId ? "All Schedules" : "Select a vessel first" },
    ...schedules
      .filter((s) => !filters.shipId || s.shipId === filters.shipId)
      .map((s) => ({ value: s.id, label: `${s.departureTime} — ${routeLabel(s.route)}` })),
  ];

  const CHIP_LABELS = {
    search: (v) => `"${v}"`,
    date: (v) => v,
    shipId: (v) => ships.find((s) => s.id === v)?.name || v,
    scheduleId: (v) => {
      const s = schedules.find((sch) => sch.id === v);
      return s ? `${s.departureTime} — ${routeLabel(s.route)}` : v;
    },
    transactionType: (v) => (v === "SIGN_IN" ? "Outbound · Departing" : "Inbound · Arriving"),
    accommodationClass: (v) => ACCOMMODATION_CLASSES.find((c) => c.value === v)?.label || v,
  };

  const activeChips = Object.entries(filters).filter(([, v]) => v);

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-10 pl-9 focus:border-emerald-400 focus:ring-emerald-500/20"
            placeholder="Search name, ticket #, or mobile number"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>
        <Input
          className="h-10 focus:border-emerald-400 focus:ring-emerald-500/20"
          type="date"
          value={filters.date}
          onChange={(e) => set("date", e.target.value)}
          title="Registration date"
        />
        <Select
          className="h-10 focus:border-emerald-400 focus:ring-emerald-500/20"
          value={filters.shipId || "ALL"}
          onValueChange={(v) => set("shipId", v === "ALL" ? "" : v)}
          options={shipOptions}
        />
        <Select
          className="h-10 focus:border-emerald-400 focus:ring-emerald-500/20"
          value={filters.scheduleId || "ALL"}
          onValueChange={(v) => set("scheduleId", v === "ALL" ? "" : v)}
          options={scheduleOptions}
          disabled={!filters.shipId}
        />
        <Select
          className="h-10 focus:border-emerald-400 focus:ring-emerald-500/20"
          value={filters.transactionType || "ALL"}
          onValueChange={(v) => set("transactionType", v === "ALL" ? "" : v)}
          options={DIRECTION_OPTIONS}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          value={filters.accommodationClass || "ALL"}
          onValueChange={(v) => set("accommodationClass", v === "ALL" ? "" : v)}
          options={CLASS_OPTIONS}
          className="h-10 w-52 focus:border-emerald-400 focus:ring-emerald-500/20"
        />
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeChips.map(([field, value]) => (
              <button
                key={field}
                onClick={() => clear(field)}
                className="inline-flex items-center gap-1 rounded-full bg-graphite/5 px-2.5 py-1 text-xs font-medium text-graphite transition-colors hover:bg-graphite/10"
              >
                {CHIP_LABELS[field] ? CHIP_LABELS[field](value) : value}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              onClick={() => onChange({ ...EMPTY_MANIFEST_FILTERS })}
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
