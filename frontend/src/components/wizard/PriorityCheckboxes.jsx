import { PRIORITY_FLAG_OPTIONS } from "../../lib/priority";
import { cn } from "../../lib/cn";

export function PriorityCheckboxes({ values, onChange, compact = false, theme, options = PRIORITY_FLAG_OPTIONS }) {
  function toggle(field) {
    onChange({ ...values, [field]: !values[field] });
  }

  const checkedClass =
    theme === "light"
      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
      : "border-graphite bg-mint/20 text-graphite shadow-sm";
  const uncheckedClass =
    theme === "light"
      ? "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/60"
      : "border-slate-200 bg-white text-ink hover:border-slate-300 hover:bg-slate-50";
  const accentClass = theme === "light" ? "accent-blue-600" : "accent-graphite";

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const checked = !!values[opt.field];
        return (
          <label
            key={opt.field}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition-all duration-150",
              compact ? "text-[10.5px]" : "text-xs",
              checked ? checkedClass : uncheckedClass
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(opt.field)}
              className={cn("h-3.5 w-3.5 shrink-0", accentClass)}
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
