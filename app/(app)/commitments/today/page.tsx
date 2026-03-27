"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, ChevronDown, ChevronUp, Check } from "lucide-react"
import { useTodayCommitments } from "@/hooks/use-recurring-commitments"
import { LogForm } from "@/components/features/commitments/log-form"
import type { TodayCommitment } from "@/lib/types"

function fmtMins(m: number) {
  if (m >= 60) return `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ""}`
  return `${m} min`
}

export default function TodayPage() {
  const { data: commitments, isPending } = useTodayCommitments()
  const [expanded, setExpanded] = useState<string | null>(null)

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  if (isPending) {
    return (
      <div className="max-w-lg mx-auto space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-20" style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)" }} />
        ))}
      </div>
    )
  }

  if (!commitments || commitments.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>Today</h1>
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", letterSpacing: "0.1em", color: "var(--ink-faint)", marginTop: "0.3rem" }}>{today}</p>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "3rem", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.95rem", color: "var(--ink-muted)", marginBottom: "1rem" }}>No active commitments yet.</p>
          <Link href="/commitments" style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem", color: "var(--red-ink)", letterSpacing: "0.05em", textDecoration: "none" }}>
            Create your first commitment →
          </Link>
        </div>
      </div>
    )
  }

  const loggedCount = commitments.filter((c) => c.today_logged).length

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-start justify-between" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>Today</h1>
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", letterSpacing: "0.1em", color: "var(--ink-faint)", marginTop: "0.3rem" }}>{today}</p>
        </div>
        <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.85rem", color: "var(--ink-muted)", marginTop: "0.25rem" }}>
          {loggedCount}/{commitments.length}
        </p>
      </div>

      <div className="space-y-2">
        {commitments.map((c: TodayCommitment) => (
          <div key={c.id} style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", overflow: "hidden" }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span style={{ fontSize: "1.25rem" }}>{c.emoji}</span>
                <div>
                  <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>{c.name}</p>
                  {c.today_logged && c.today_minutes ? (
                    <p className="flex items-center gap-1" style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", color: "var(--green-ink)", marginTop: "0.2rem" }}>
                      <Check className="w-3 h-3" />
                      {fmtMins(c.today_minutes)}
                      {c.today_note && <span style={{ color: "var(--ink-faint)" }}> · {c.today_note}</span>}
                    </p>
                  ) : (
                    <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", color: "var(--ink-faint)", marginTop: "0.2rem" }}>Not logged yet</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="flex items-center gap-1.5 transition-colors"
                style={{
                  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem",
                  letterSpacing: "0.05em", height: "1.9rem", padding: "0 0.75rem",
                  background: c.today_logged ? "transparent" : "var(--ink)",
                  color: c.today_logged ? "var(--ink-muted)" : "var(--paper)",
                  border: c.today_logged ? "1px solid var(--card-border)" : "none",
                  cursor: "pointer",
                }}
              >
                {c.today_logged ? (
                  <>{expanded === c.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Edit</>
                ) : (
                  <><Plus className="w-3 h-3" /> Log</>
                )}
              </button>
            </div>

            {expanded === c.id && (
              <div className="px-5 pb-5" style={{ borderTop: "1px solid var(--rule)", paddingTop: "1rem" }}>
                <LogForm commitment={c} existingMinutes={c.today_minutes} onSaved={() => setExpanded(null)} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <Link href="/commitments" style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--ink-faint)", textDecoration: "none", letterSpacing: "0.05em" }}>
          View all commitments →
        </Link>
      </div>
    </div>
  )
}
