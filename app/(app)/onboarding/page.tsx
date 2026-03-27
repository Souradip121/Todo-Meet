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
      {
        onSuccess: (res) => {
          setCreatedId(res.id)
          setStep("logging")
        },
      }
    )
  }

  function handleLogAndGo() {
    if (!createdId) return
    const mins = parseInt(minutes)
    if (mins > 0) {
      logTime.mutate(
        { duration_minutes: mins },
        { onSuccess: () => router.replace("/commitments/today") }
      )
    } else {
      router.replace("/commitments/today")
    }
  }

  if (step === "logging") {
    return (
      <div className="max-w-sm mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <span className="text-5xl">{emoji}</span>
          <h2 className="text-xl font-semibold text-slate-50 mt-3">{name}</h2>
          <p className="text-sm text-slate-400 mt-1">Did you do it today? Log your first session.</p>
        </div>
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              autoFocus
              min={1}
              placeholder="Minutes (e.g. 45)"
              className="flex-1 bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-11 px-4 text-sm"
            />
            <span className="text-sm text-slate-500">min</span>
          </div>
          <button
            onClick={handleLogAndGo}
            disabled={logTime.isPending}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium h-11 rounded-lg transition-colors"
          >
            {logTime.isPending ? "Saving…" : minutes ? "Log & start →" : "Skip for now →"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-50">Welcome to showup.day</h1>
        <p className="text-sm text-slate-400 mt-2">Pick one thing you want to stay consistent with.</p>
      </div>

      {/* Presets */}
      <div className="w-full grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.emoji}
            onClick={() => handlePreset(p)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
              name === p.name && emoji === p.emoji
                ? "bg-indigo-500/10 border-indigo-500/40 text-slate-50"
                : "bg-[#111118] border-[#1E1E2E] text-slate-300 hover:border-[#2a2a3e]"
            }`}
          >
            <span className="text-lg">{p.emoji}</span>
            <span className="text-sm">{p.name}</span>
          </button>
        ))}
      </div>

      {/* Custom name */}
      <div className="w-full space-y-2">
        <p className="text-xs text-slate-500">Or type your own:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={PRESETS.some((p) => p.emoji === emoji) ? "" : emoji}
            onChange={(e) => setEmoji(e.target.value.slice(-2) || "⚡")}
            placeholder="emoji"
            maxLength={2}
            className="w-14 bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-10 px-2 text-sm text-center"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What are you committing to?"
            maxLength={80}
            className="flex-1 bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-10 px-3 text-sm"
          />
        </div>
      </div>

      {/* Period */}
      <div className="w-full">
        <p className="text-xs text-slate-500 mb-2">For how long?</p>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodDays(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                periodDays === p.value
                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40"
                  : "bg-[#0A0A0F] text-slate-400 border-[#1E1E2E] hover:text-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={!name.trim() || createCommitment.isPending}
        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium h-11 rounded-lg transition-colors text-base"
      >
        {createCommitment.isPending ? "Starting…" : "Start →"}
      </button>
    </div>
  )
}
