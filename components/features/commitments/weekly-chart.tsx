"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { CommitmentStatPoint } from "@/lib/types"

interface WeeklyChartProps {
  data: CommitmentStatPoint[]
  color?: "green" | "indigo" | "amber"
}

const COLOR_MAP = {
  green: "#22C55E",
  indigo: "#6366F1",
  amber: "#F59E0B",
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function WeeklyChart({ data, color = "indigo" }: WeeklyChartProps) {
  const fill = COLOR_MAP[color]

  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center">
        <p className="text-xs text-[var(--ink-faint)]">No data yet</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="week"
          tickFormatter={formatWeek}
          tick={{ fill: "var(--ink-faint)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${Math.round(v / 60)}h`}
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
          formatter={(value) => [formatMinutes(Number(value)), "Time"]}
          labelFormatter={(label) => `Week of ${formatWeek(label)}`}
          cursor={{ fill: "var(--card-border)" }}
        />
        <Bar dataKey="total_minutes" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={fill} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
