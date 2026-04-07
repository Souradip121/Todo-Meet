import { CommitmentHeatmap } from "@/components/features/commitments/commitment-heatmap"
import Link from "next/link"
import type { CommitmentLog } from "@/lib/types"

interface ShareData {
  name: string
  emoji: string
  color: "green" | "indigo" | "amber"
  period_days: number
  start_date: string
  end_date: string
  logs: CommitmentLog[]
  streak: number
  total_hours: number
  days_logged: number
}

async function getShareData(token: string): Promise<ShareData | null> {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) return null
  try {
    const res = await fetch(`${base}/share/${token}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getShareData(token)

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-sm">This link is invalid or expired.</p>
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 text-sm mt-3 block">
            Start your own commitment →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--paper)", backgroundImage: "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
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
            <span style={{ fontSize: "2.5rem" }}>{data.emoji}</span>
            <div>
              <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.4rem", fontWeight: 700, color: "var(--ink)" }}>{data.name}</h1>
              <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--ink-faint)", marginTop: "0.2rem" }}>
                {data.period_days}-day commitment
              </p>
            </div>
          </div>

          {/* Heatmap */}
          <CommitmentHeatmap logs={data.logs} color={data.color} />

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
            {data.streak > 0 && (
              <div>
                <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--ink-faint)" }}>Streak</p>
                <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", fontWeight: 900, color: "var(--amber-ink)" }}>🔥 {data.streak}</p>
              </div>
            )}
            {[["Total", `${data.total_hours}h`], ["Days logged", `${data.days_logged}`]].map(([label, val]) => (
              <div key={label}>
                <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--ink-faint)" }}>{label}</p>
                <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", fontWeight: 900, color: "var(--ink)" }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 mb-3">Track your own commitments</p>
          <Link
            href="/register"
            className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-medium h-10 px-6 rounded-lg transition-colors text-sm"
          >
            Start your own →
          </Link>
        </div>
      </div>
    </div>
  )
}
