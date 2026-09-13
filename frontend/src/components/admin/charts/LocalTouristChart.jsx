import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#18251D", "#B7FF72"];

export function LocalTouristChart({ local, tourist }) {
  const total = local + tourist;
  const data = [
    { name: "Local", value: local },
    { name: "Tourist", value: tourist },
  ];

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        No passenger data for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value} (${Math.round((value / total) * 100)}%)`, name]}
          contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
        />
        <Legend
          verticalAlign="bottom"
          height={28}
          iconType="circle"
          formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
