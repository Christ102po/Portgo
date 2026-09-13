import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../../lib/cn";

const ACCENT_COLORS = {
  teal: { border: "border-t-teal-400", iconBg: "bg-teal-50", iconText: "text-teal-600" },
  green: { border: "border-t-emerald-500", iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
  red: { border: "border-t-red-400", iconBg: "bg-red-50", iconText: "text-red-600" },
  amber: { border: "border-t-amber-400", iconBg: "bg-amber-50", iconText: "text-amber-600" },
  blue: { border: "border-t-blue-400", iconBg: "bg-blue-50", iconText: "text-blue-600" },
  violet: { border: "border-t-violet-400", iconBg: "bg-violet-50", iconText: "text-violet-600" },
};

function TrendBadge({ changePct }) {
  if (changePct === undefined || changePct === null) return null;
  const isFlat = changePct === 0;
  const isUp = changePct > 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        isFlat ? "bg-slate-100 text-slate-500" : isUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      )}
    >
      <Icon className="h-3 w-3" />
      {isUp && !isFlat ? "+" : ""}
      {changePct}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
  accentColor,
  sublabel,
  changePct,
  trendLabel,
}) {
  const colors = ACCENT_COLORS[accent ? "green" : accentColor] || null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        colors && cn("border-t-4", colors.border)
      )}
    >
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110",
              colors ? cn(colors.iconBg, colors.iconText) : "bg-surface text-graphite"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tabular-nums text-graphite">
          {value}
        </p>
        <TrendBadge changePct={changePct} />
      </div>
      {sublabel && (
        <p className="relative mt-1 text-xs text-slate-400">
          {sublabel}
          {trendLabel && <span className="ml-1 text-slate-300">&middot; {trendLabel}</span>}
        </p>
      )}
    </div>
  );
}
