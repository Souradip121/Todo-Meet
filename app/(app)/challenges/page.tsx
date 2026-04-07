"use client"

import { useState } from "react"
import { useChallenges, useLeaderboard, useJoinChallenge, useCheckin } from "@/hooks/use-challenges"
import type { Challenge } from "@/hooks/use-challenges"

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function fmtPaise(p: number) {
  if (p >= 10000000) return `₹${(p / 10000000).toFixed(1)}Cr`
  if (p >= 100000) return `₹${(p / 100000).toFixed(1)}L`
  if (p >= 1000) return `₹${(p / 1000).toFixed(0)}K`
  return `₹${(p / 100).toFixed(0)}`
}

const AVATAR_COLORS = ["#1A1814", "#1E3A5F", "#B91C1C", "#166534", "#92400E"]

export default function ChallengesPage() {
  const { data: challenges = [], isLoading } = useChallenges()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lbPeriod, setLbPeriod] = useState<"weekly" | "alltime">("weekly")
  const joinMutation = useJoinChallenge()
  const checkinMutation = useCheckin()

  const selected = challenges.find((c) => c.id === selectedId) ?? challenges[0] ?? null
  const { data: lb } = useLeaderboard(selected?.id ?? "", lbPeriod)

  const top3 = lb?.entries.slice(0, 3) ?? []
  const rest = lb?.entries.slice(3) ?? []

  // Reorder podium: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean)

  return (
    <div style={{ fontFamily: "var(--font-lora), serif", color: "var(--ink)" }}>
      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--red-ink)", border: "1px solid var(--red-ink)", display: "inline-block", padding: "0.22rem 0.6rem", marginBottom: "0.7rem" }}>
          community challenges
        </div>
        <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: "0.3rem" }}>
          Show up with <em style={{ fontStyle: "italic", color: "var(--red-ink)" }}>everyone.</em>
        </h1>
        <p style={{ fontSize: "0.92rem", color: "var(--ink-muted)", maxWidth: 480 }}>
          Fixed-duration challenges, open to all. Public leaderboard. Optional stakes. One tap to join.
        </p>
      </div>

      {isLoading && (
        <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink-faint)" }}>Loading challenges…</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.6rem", alignItems: "start" }}>
        {/* LEFT: challenge cards + detail */}
        <div>
          <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.9rem" }}>
            {challenges.length} active challenges
          </div>

          {/* Challenge cards */}
          <div style={{ border: "1.5px solid var(--card-border)" }}>
            {challenges.map((c, i) => {
              const isActive = (selected?.id ?? challenges[0]?.id) === c.id
              const stillGoingPct = c.participant_count > 0
                ? Math.round((c.still_going / c.participant_count) * 100)
                : 0

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    background: isActive ? "#FFFAF8" : "var(--card-bg)",
                    padding: "1.3rem 1.5rem",
                    borderBottom: i < challenges.length - 1 ? "1px solid var(--card-border)" : "none",
                    cursor: "pointer",
                    position: "relative",
                    borderLeft: isActive ? "3px solid var(--red-ink)" : "3px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.8rem" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.15rem" }}>
                        {c.category} · {c.duration_days} days
                      </div>
                      <div style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.2rem", fontWeight: 700 }}>{c.title}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.06em", background: "var(--paper)", border: `1px solid ${c.status === "active" ? "var(--red-ink)" : "var(--card-border)"}`, color: c.status === "active" ? "var(--red-ink)" : "var(--ink-muted)", padding: "0.22rem 0.55rem", whiteSpace: "nowrap" }}>
                      {c.status === "active" ? `● live · day ${c.day_number}` : `starts ${c.start_date.slice(5)}`}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "1.2rem", marginBottom: "0.9rem" }}>
                    {[
                      [c.participant_count.toLocaleString(), "joined"],
                      [c.status === "active" ? `${stillGoingPct}%` : "—", "still going"],
                      [c.total_staked_paise > 0 ? fmtPaise(c.total_staked_paise) : "—", "staked"],
                      [`${c.days_remaining} days`, "remaining"],
                    ].map(([val, lbl]) => (
                      <div key={lbl}>
                        <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.95rem", fontWeight: 500, color: "var(--ink)" }}>{val}</div>
                        <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Participation bar */}
                  <div style={{ height: 4, background: "var(--paper)", border: "1px solid var(--card-border)", marginBottom: "0.8rem", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${stillGoingPct}%`, background: "var(--red-ink)" }} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex" }}>
                      {[...Array(Math.min(4, c.participant_count))].map((_, idx) => (
                        <div key={idx} style={{ width: 24, height: 24, borderRadius: "50%", background: AVATAR_COLORS[idx % AVATAR_COLORS.length], marginLeft: idx > 0 ? -6 : 0, border: "2px solid var(--card-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.52rem", color: "#fff" }}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!c.joined && !joinMutation.isPending) joinMutation.mutate({ id: c.id })
                      }}
                      style={{
                        fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", letterSpacing: "0.06em",
                        background: c.joined ? "transparent" : "var(--ink)", color: c.joined ? "var(--green-ink)" : "var(--paper)",
                        border: c.joined ? "1px solid var(--green-ink)" : "none",
                        padding: "0.35rem 0.9rem",
                        cursor: c.joined || joinMutation.isPending ? "default" : "pointer",
                        opacity: joinMutation.isPending ? 0.5 : 1,
                      }}
                    >
                      {c.joined ? "✓ joined" : joinMutation.isPending ? "…" : "Join →"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Challenge detail */}
          {selected && (
            <div style={{ marginTop: "1.6rem", background: "var(--card-bg)", border: "1.5px solid var(--card-border)", borderLeft: "3px solid var(--red-ink)", padding: "1.3rem 1.5rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.3rem", fontWeight: 700 }}>{selected.title}</div>
                  <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-muted)", marginTop: "0.15rem" }}>
                    {selected.status === "active" ? `Day ${selected.day_number} of ${selected.duration_days}` : `Starts ${selected.start_date}`} · {selected.category}
                  </div>
                </div>
                <div style={{ background: "var(--paper)", border: "1px solid var(--card-border)", padding: "0.35rem 0.7rem", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.4rem", fontWeight: 700, color: "var(--red-ink)", lineHeight: 1 }}>{selected.days_remaining}</div>
                  <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--ink-muted)" }}>days left</div>
                </div>
              </div>

              {selected.stakes_enabled && selected.total_staked_paise > 0 && (
                <div style={{ background: "#FFFAF8", border: "1px solid rgba(185,28,28,0.2)", padding: "0.85rem 1rem", marginBottom: "0.9rem", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)" }}>pot total</div>
                    <div style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--red-ink)" }}>
                      {fmtPaise(selected.total_staked_paise)}
                      <small style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--ink-faint)", fontWeight: 400, display: "block" }}>{selected.participant_count} participants</small>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)" }}>stake to join</div>
                    <div style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--red-ink)" }}>optional</div>
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.5rem" }}>challenge rules</div>
                {selected.rules.map((rule, i) => (
                  <div key={i} style={{ fontSize: "0.88rem", color: "var(--ink-muted)", padding: "0.38rem 0", borderBottom: i < selected.rules.length - 1 ? "1px solid var(--card-border)" : "none", display: "flex", gap: "0.6rem" }}>
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "var(--card-border)" }}>—</span>
                    {rule}
                  </div>
                ))}
              </div>

              {selected.joined && selected.status === "active" && (
                <button
                  onClick={() => checkinMutation.mutate({ id: selected.id })}
                  disabled={checkinMutation.isPending}
                  style={{ marginTop: "1rem", width: "100%", background: "var(--ink)", color: "var(--paper)", border: "none", height: "2.5rem", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem", letterSpacing: "0.06em", cursor: "pointer" }}
                >
                  {checkinMutation.isPending ? "Checking in…" : "✓ Check in today"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: leaderboard */}
        <div>
          <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.9rem" }}>leaderboard</div>
          <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)" }}>
            {/* Header */}
            <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1rem", fontWeight: 700 }}>{selected?.title ?? "—"}</span>
              <div style={{ display: "flex" }}>
                {(["weekly", "alltime"] as const).map((p) => (
                  <button key={p} onClick={() => setLbPeriod(p)} style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.08em", padding: "0.28rem 0.65rem", border: "1px solid var(--card-border)", borderRight: p === "weekly" ? "none" : undefined, background: lbPeriod === p ? "var(--ink)" : "transparent", color: lbPeriod === p ? "var(--paper)" : "var(--ink-muted)", cursor: "pointer" }}>
                    {p === "weekly" ? "this week" : "all-time"}
                  </button>
                ))}
              </div>
            </div>

            {/* Podium */}
            {podium.length > 0 && (
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "0.5rem", padding: "1.2rem 1.3rem 0" }}>
                {[podium[0], podium[1], podium[2]].map((entry, idx) => {
                  if (!entry) return null
                  const heights = [38, 52, 28]
                  const sizes = [38, 46, 34]
                  const rankLabel = ["2nd", "1st", "3rd"][idx]
                  const isFirst = idx === 1
                  return (
                    <div key={entry.user_id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", flex: 1 }}>
                      <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{rankLabel}</span>
                      <div style={{ width: sizes[idx], height: sizes[idx], borderRadius: "50%", background: AVATAR_COLORS[idx], display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "#fff", position: "relative" }}>
                        {isFirst && <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 13 }}>👑</span>}
                        {initials(entry.display_name)}
                      </div>
                      <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: isFirst ? "var(--ink)" : "var(--ink-muted)", textAlign: "center" }}>{entry.display_name.split(" ")[0]}</div>
                      <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", fontWeight: 500, color: isFirst ? "var(--red-ink)" : "var(--ink)" }}>🔥{entry.current_streak}d</div>
                      <div style={{ width: "100%", background: isFirst ? "#FFF5F5" : "var(--paper)", border: `1px solid ${isFirst ? "rgba(185,28,28,0.2)" : "var(--card-border)"}`, borderBottom: "none", height: heights[idx] }} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Ranked list */}
            <div style={{ padding: "0.5rem 0" }}>
              {rest.map((entry) => (
                <div key={entry.user_id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.5rem 1.3rem", background: entry.is_me ? "#FFFAF8" : undefined, borderLeft: entry.is_me ? "2px solid var(--red-ink)" : "2px solid transparent" }}>
                  <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)", minWidth: 22, textAlign: "right" }}>{entry.rank}</span>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: AVATAR_COLORS[Number(entry.rank) % AVATAR_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", color: "#fff", flexShrink: 0 }}>
                    {initials(entry.display_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.display_name}{entry.is_me && <span style={{ color: "var(--red-ink)", fontSize: "0.58rem", marginLeft: "0.3rem" }}>← you</span>}
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink)" }}>🔥 {entry.current_streak}d</span>
                </div>
              ))}
            </div>

            {/* Pinned "you" row */}
            {lb?.my_entry && lb.my_entry.rank > 3 && (
              <div style={{ borderTop: "1px solid var(--card-border)", padding: "0.5rem 1.3rem", background: "#FFFAF8", display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--red-ink)", fontWeight: 500 }}>#{lb.my_entry.rank}</span>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: AVATAR_COLORS[0], display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", color: "#fff" }}>
                  {initials(lb.my_entry.display_name)}
                </div>
                <div style={{ flex: 1, fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink)" }}>
                  {lb.my_entry.display_name} <span style={{ color: "var(--red-ink)", fontSize: "0.58rem" }}>← you</span>
                </div>
                <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--red-ink)" }}>🔥 {lb.my_entry.current_streak}d</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
