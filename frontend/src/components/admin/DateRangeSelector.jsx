import { cn } from "../../lib/cn";
import { Input } from "../ui/Input";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

export function DateRangeSelector({ range, from, to, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => onChange({ range: r.value, from, to })}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
              range === r.value
                ? "bg-graphite text-mint shadow-soft"
                : "text-slate-500 hover:text-graphite"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => onChange({ range, from: e.target.value, to })}
            className="h-9 w-40"
          />
          <span className="text-xs text-slate-400">to</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => onChange({ range, from, to: e.target.value })}
            className="h-9 w-40"
          />
        </div>
      )}
    </div>
  );
}
