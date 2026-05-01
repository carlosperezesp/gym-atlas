"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  date: string;
  e1rm: number;
}

interface E1RMChartProps {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-zinc-400 mb-0.5">{label}</p>
      <p className="font-mono font-600 text-orange-400">{payload[0].value} kg e1RM</p>
    </div>
  );
}

export default function E1RMChart({ data }: E1RMChartProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data.map((d) => d.e1rm));
  const pb = data.find((d) => d.e1rm === max);

  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          {pb && (
            <ReferenceLine
              y={pb.e1rm}
              stroke="#f97316"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
          )}
          <Line
            type="monotone"
            dataKey="e1rm"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: "#f97316", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#f97316" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
