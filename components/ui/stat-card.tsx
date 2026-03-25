// Stat card — single metric with label
// Usage: <StatCard label="Current Streak" value={42} suffix="days" />

interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  trend?: string
  trendUp?: boolean
  mono?: boolean
}

export function StatCard({ label, value, suffix, trend, trendUp, mono }: StatCardProps) {
  return (
    <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-4xl font-semibold text-slate-50 ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-slate-400">{suffix}</span>
        )}
      </div>
      {trend && (
        <p className={`text-xs mt-2 ${trendUp ? "text-green-500" : "text-slate-500"}`}>
          {trendUp ? "↑" : "↓"} {trend}
        </p>
      )}
    </div>
  )
}

