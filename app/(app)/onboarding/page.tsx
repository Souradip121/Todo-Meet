"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCreateCommitment, useLogTime } from "@/hooks/use-recurring-commitments"

const PRESETS = [
  { emoji: "🏋️", name: "Go to gym" },
  { emoji: "🐍", name: "Learn Python" },
  { emoji: "💻", name: "Build my project" },
  { emoji: "📚", name: "Read books" },
  { emoji: "🧘", name: "Meditate" },
  { emoji: "✍️", name: "Write daily" },
]

const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "6 months", value: 180 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const createCommitment = useCreateCommitment()
  const [emoji, setEmoji] = useState("💻")
  const [name, setName] = useState("")
  const [periodDays, setPeriodDays] = useState(30)
  const [step, setStep] = useState<"pick" | "logging">("pick")
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [minutes, setMinutes] = useState("")
  const logTime = useLogTime(createdId ?? "")

  function handlePreset(preset: { emoji: string; name: string }) {
    setEmoji(preset.emoji)
    setName(preset.name)
  }

  function handleStart() {
    if (!name.trim()) return
    createCommitment.mutate(
      { name: name.trim(), emoji, period_days: periodDays },
      { onSuccess: (res) => { setCreatedId(res.id); setStep("logging") } }
    )
  }

  function handleLogAndGo() {
    if (!createdId) return
    const mins = parseInt(minutes)
    if (mins > 0) {
      logTime.mutate({ duration_minutes: mins }, { onSuccess: () => router.replace("/commitments/today") })
    } else {
      router.replace("/commitments/today")
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--paper)", border: "1.5px solid var(--card-border)", color: "var(--ink)",
    fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", outline: "none",
    height: "2.6rem", padding: "0 0.75rem", width: "100%",
  }

  if (step === "logging") {
    return (
      <div className="max-w-sm mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <span style={{ fontSize: "3rem" }}>{emoji}</span>
          <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--ink)", marginTop: "0.75rem" }}>{name}</h2>
          <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", color: "var(--ink-muted)", marginTop: "0.4rem" }}>Did you do it today? Log your first session.</p>
        </div>
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)}
              autoFocus min={1} placeholder="Minutes (e.g. 45)"
              style={{ ...inputStyle, flex: 1, width: "auto" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
            />
            <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--ink-faint)" }}>min</span>
          </div>
          <button onClick={handleLogAndGo} disabled={logTime.isPending} style={{
            width: "100%", background: "var(--ink)", color: "var(--paper)", border: "none",
            height: "2.8rem", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.85rem",
            letterSpacing: "0.05em", cursor: logTime.isPending ? "not-allowed" : "pointer",
          }}>
            {logTime.isPending ? "Saving…" : minutes ? "Log & start →" : "Skip for now →"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Welcome to show<span style={{ color: "var(--red-ink)" }}>up</span>.day
        </h1>
        <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.95rem", color: "var(--ink-muted)", marginTop: "0.5rem" }}>
          Pick one thing you want to stay consistent with.
        </p>
      </div>

      <div className="w-full grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <button key={p.emoji} onClick={() => handlePreset(p)}
            className="flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
            style={{
              background: name === p.name && emoji === p.emoji ? "rgba(185,28,28,0.06)" : "var(--card-bg)",
              border: name === p.name && emoji === p.emoji ? "1.5px solid rgba(185,28,28,0.4)" : "1.5px solid var(--card-border)",
              cursor: "pointer",
            }}>
            <span style={{ fontSize: "1.2rem" }}>{p.emoji}</span>
            <span style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.85rem", color: "var(--ink)" }}>{p.name}</span>
          </button>
        ))}
      </div>

      <div className="w-full space-y-2">
        <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--ink-faint)" }}>Or type your own:</p>
        <div className="flex gap-2">
          <input type="text" value={PRESETS.some((p) => p.emoji === emoji) ? "" : emoji}
            onChange={(e) => setEmoji(e.target.value.slice(-2) || "⚡")}
            placeholder="emoji" maxLength={2}
            style={{ ...inputStyle, width: "3rem", textAlign: "center", padding: 0, flex: "none" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
          />
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="What are you committing to?" maxLength={80}
            style={{ ...inputStyle, flex: 1, width: "auto" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
          />
        </div>
      </div>

      <div className="w-full">
        <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--ink-faint)", marginBottom: "0.5rem" }}>For how long?</p>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => setPeriodDays(p.value)}
              style={{
                fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", letterSpacing: "0.05em",
                padding: "0.3rem 0.75rem", cursor: "pointer",
                background: periodDays === p.value ? "var(--ink)" : "var(--card-bg)",
                color: periodDays === p.value ? "var(--paper)" : "var(--ink-muted)",
                border: periodDays === p.value ? "1.5px solid var(--ink)" : "1.5px solid var(--card-border)",
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleStart} disabled={!name.trim() || createCommitment.isPending}
        style={{
          width: "100%", background: "var(--ink)", color: "var(--paper)", border: "none",
          height: "2.8rem", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.9rem",
          letterSpacing: "0.05em", cursor: !name.trim() || createCommitment.isPending ? "not-allowed" : "pointer",
          opacity: !name.trim() || createCommitment.isPending ? 0.5 : 1,
        }}>
        {createCommitment.isPending ? "Starting…" : "Start →"}
      </button>
    </div>
  )
}
