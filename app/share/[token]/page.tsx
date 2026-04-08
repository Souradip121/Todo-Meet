import { CommitmentHeatmap } from "@/components/features/commitments/commitment-heatmap"
import Link from "next/link"
import type { CommitmentLog } from "@/lib/types"

interface ShareData {
  commitment: {
    name: string
    emoji: string
    color: "green" | "indigo" | "amber"
    period_days: number
    start_date: string
    end_date: string
  }
  owner: {
    display_name: string
    avatar_url: string | null
    username: string | null
  }
  logs: CommitmentLog[]
  week_start: string | null
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const COLOR_STYLES: Record<string, string> = {
  green:  "#22C55E",
  indigo: "#6366F1",
  amber:  "#F59E0B",
}

async function getShareData(token: string): Promise<ShareData | null> {
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"
  try {
    const res = await fetch(`${baseUrl}/api/commitments/share/${token}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function fmtMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function WeekView({ logs, weekStart, color }: { logs: CommitmentLog[]; weekStart: string; color: string }) {
  const accentColor = COLOR_STYLES[color] ?? COLOR_STYLES.indigo

  // Build 7 days from weekStart
  const days: Array<{ date: string; label: string; shortDate: string; minutes: number }> = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const log = logs.find((l) => l.date === dateStr)
    days.push({
      date:      dateStr,
      label:     DAY_LABELS[d.getDay()],
      shortDate: `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`,
      minutes:   log?.duration_minutes ?? 0,
    })
  }

  const totalMins = days.reduce((s, d) => s + d.minutes, 0)
  const daysLogged = days.filter((d) => d.minutes > 0).length
  const maxMins = Math.max(...days.map((d) => d.minutes), 1)

  const weekLabel = new Date(weekStart).toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
  })

  return (
    <div>
      <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--ink-faint)", marginBottom: "1.2rem" }}>
        Week of {weekLabel}
      </p>

      {/* Bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: "80px", marginBottom: "0.5rem" }}>
        {days.map((day) => {
          const pct = maxMins > 0 ? day.minutes / maxMins : 0
          const barH = Math.max(pct * 72, day.minutes > 0 ? 4 : 0)
          return (
            <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              <div
                title={day.minutes > 0 ? fmtMinutes(day.minutes) : "No log"}
                style={{
                  width: "100%",
                  height: `${barH}px`,
                  background: day.minutes > 0 ? accentColor : "var(--card-border)",
                  opacity: day.minutes > 0 ? 0.9 : 0.4,
                  borderRadius: "2px 2px 0 0",
                  transition: "height 0.2s",
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Day labels */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {days.map((day) => (
          <div key={day.date} style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", color: day.minutes > 0 ? "var(--ink)" : "var(--ink-faint)" }}>
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "1.5rem", paddingTop: "1rem", marginTop: "1rem", borderTop: "1px solid var(--rule)" }}>
        <div>
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--ink-faint)" }}>This week</p>
          <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", fontWeight: 900, color: "var(--ink)" }}>{fmtMinutes(totalMins)}</p>
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--ink-faint)" }}>Days logged</p>
          <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", fontWeight: 900, color: "var(--ink)" }}>{daysLogged}/7</p>
        </div>
      </div>
    </div>
  )
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getShareData(token)

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-sm">This link is invalid or expired.</p>
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm mt-3 block">
            Start your own commitment →
          </Link>
        </div>
      </div>
    )
  }

  const { commitment, owner, logs, week_start } = data
  const totalMins = logs.reduce((s, l) => s + l.duration_minutes, 0)
  const totalHours = (totalMins / 60).toFixed(1)

  // Compute streak (only for full history, not week view)
  let streak = 0
  if (!week_start) {
    const present = new Set(logs.map((l) => l.date))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i <= 400; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      if (present.has(key)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background:         "var(--paper)",
        backgroundImage:    "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
        backgroundSize:     "28px 28px",
      }}
    >
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="mb-8">
          <span style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            show<span style={{ color: "var(--red-ink)" }}>up</span>.day
          </span>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.5rem" }}>
          {/* Commitment header */}
          <div className="flex items-center gap-3 mb-6">
            <span style={{ fontSize: "2.5rem" }}>{commitment.emoji}</span>
            <div>
              <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.4rem", fontWeight: 700, color: "var(--ink)" }}>
                {commitment.name}
              </h1>
              <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--ink-faint)", marginTop: "0.2rem" }}>
                {owner.display_name} · {commitment.period_days}-day commitment
              </p>
            </div>
          </div>

          {week_start ? (
            <WeekView logs={logs} weekStart={week_start} color={commitment.color} />
          ) : (
            <>
              {/* Heatmap */}
              <CommitmentHeatmap logs={logs} color={commitment.color} />

              {/* Score legend */}
              <div className="flex items-center gap-2 mt-4 mb-6">
                <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)" }}>Less</span>
                {[
                  "bg-[#EEEBE3] border border-[#D4D0C4]",
                  "bg-[#dcfce7] border border-[#86efac]",
                  "bg-[#86efac] border border-[#22c55e]",
                  "bg-green-500 border border-green-600",
                  "bg-[#15803d] border border-[#14532d]",
                  "bg-amber-400 border border-amber-500",
                ].map((cls, s) => (
                  <div key={s} className={`w-3.5 h-3.5 ${cls}`} />
                ))}
                <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)" }}>More</span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6" style={{ paddingTop: "1rem", borderTop: "1px solid var(--rule)" }}>
                {streak > 0 && (
                  <div>
                    <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--ink-faint)" }}>Streak</p>
                    <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", fontWeight: 900, color: "var(--amber-ink)" }}>🔥 {streak}</p>
                  </div>
                )}
                {[["Total", `${totalHours}h`], ["Days logged", `${logs.length}`]].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--ink-faint)" }}>{label}</p>
                    <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", fontWeight: 900, color: "var(--ink)" }}>{val}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 mb-3">Track your own commitments</p>
          <Link
            href="/login"
            className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-medium h-10 px-6 rounded-lg transition-colors text-sm leading-10"
          >
            Start your own →
          </Link>
        </div>
      </div>
    </div>
  )
}
