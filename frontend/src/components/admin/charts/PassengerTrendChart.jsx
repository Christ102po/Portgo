import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function formatDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-card backdrop-blur-md">
      <p className="font-semibold text-graphite">{formatDate(label)}</p>
      <p className="text-slate-500">{payload[0].value} passengers</p>
    </div>
  );
}

export function PassengerTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B7FF72" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#B7FF72" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={{ stroke: "#E2E8F0" }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#18251D"
          strokeWidth={2}
          fill="url(#trendFill)"
          activeDot={{ r: 4, fill: "#18251D", stroke: "#B7FF72", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
