import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "../../../lib/cn";

function formatHour(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? "AM" : "PM";
  return `${h}${period}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-card backdrop-blur-md">
      <p className="font-semibold text-graphite">{formatHour(label)}</p>
      <p className="text-slate-500">{payload[0].value} registration{payload[0].value === 1 ? "" : "s"}</p>
    </div>
  );
}

export function PeakHoursChart({ data, dark = false, emptyLabel = "No registrations in the last 7 days." }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(0, ...data.map((d) => d.count));
  const peakColor = dark ? "#FFFFFF" : "#18251D";
  const gridStroke = dark ? "rgba(255,255,255,0.12)" : "#E2E8F0";
  const tickFill = dark ? "rgba(255,255,255,0.5)" : "#94A3B8";

  if (total === 0) {
    return (
      <div className={cn("flex h-[220px] items-center justify-center text-sm", dark ? "text-white/40" : "text-slate-400")}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="hour"
          tickFormatter={formatHour}
          interval={2}
          tick={{ fontSize: 10, fill: tickFill }}
          axisLine={{ stroke: gridStroke }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(24,37,29,0.05)" }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.hour} fill={entry.count === maxCount && maxCount > 0 ? peakColor : "#B7FF72"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
