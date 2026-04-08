"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface ComparisonPoint {
  label: string
  current: number
  previous: number
}

interface ComparisonChartProps {
  data: ComparisonPoint[]
  currentLabel: string
  previousLabel: string
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function ComparisonChart({ data, currentLabel, previousLabel }: ComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center">
        <p className="text-xs text-[var(--ink-faint)]">No data yet</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barCategoryGap="30%">
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--ink-faint)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`}
          tick={{ fill: "var(--ink-faint)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card-bg)",
            border: "1px solid #1E1E2E",
            borderRadius: "8px",
            fontSize: 12,
            color: "var(--ink-muted)",
          }}
          formatter={(value, name) => [
            formatMinutes(Number(value)),
            name === "current" ? currentLabel : previousLabel,
          ]}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
              {value === "current" ? currentLabel : previousLabel}
            </span>
          )}
          iconType="square"
          iconSize={8}
          wrapperStyle={{ paddingTop: 8 }}
        />
        <Bar dataKey="previous" fill="#52525b" radius={[3, 3, 0, 0]} maxBarSize={20} />
        <Bar dataKey="current" fill="#6366F1" radius={[3, 3, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
