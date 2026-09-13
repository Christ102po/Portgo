import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const LABELS = { ECONOMY: "Economy", TOURIST_AIRCON: "Tourist Aircon", BUSINESS: "Business", UNCLASSED: "Unclassed" };
const COLORS = ["#18251D", "#3F5747", "#B7FF72", "#94A3B8"];

export function ClassDistributionChart({ breakdown }) {
  const data = Object.entries(breakdown || {}).map(([key, value]) => ({
    name: LABELS[key] || key,
    value,
  }));

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        No tickets sold for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "#F8FAFC" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
