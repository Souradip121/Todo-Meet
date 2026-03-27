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
    <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.5rem" }}>
      <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span style={{
          fontFamily: mono ? "var(--font-ibm-mono), monospace" : "var(--font-playfair), serif",
          fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--ink)",
        }}>
          {value}
        </span>
        {suffix && (
          <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--ink-faint)", letterSpacing: "0.05em" }}>
            {suffix}
          </span>
        )}
      </div>
      {trend && (
        <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", marginTop: "0.4rem", color: trendUp ? "var(--green-ink)" : "var(--ink-faint)" }}>
          {trendUp ? "↑" : "↓"} {trend}
        </p>
      )}
    </div>
  )
}

