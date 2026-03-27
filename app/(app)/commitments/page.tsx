"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import {
  useCommitments,
  useCreateCommitment,
} from "@/hooks/use-recurring-commitments"
import { CommitmentCard } from "@/components/features/commitments/commitment-card"
import type { RecurringCommitment } from "@/lib/types"

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "6 months", value: 180 },
  { label: "1 year", value: 365 },
]

const COLOR_OPTIONS = [
  { label: "Green", value: "green", cls: "bg-green-500" },
  { label: "Indigo", value: "indigo", cls: "bg-indigo-500" },
  { label: "Amber", value: "amber", cls: "bg-amber-400" },
] as const

const EMOJI_PRESETS = ["🏋️", "🐍", "💻", "📚", "🎨", "✍️", "🎸", "🏃", "🧘", "🗣️"]

export default function CommitmentsPage() {
  const { data: active = [], isPending } = useCommitments(false)
  const { data: all = [] } = useCommitments(true)
  const archived = all.filter((c) => c.status === "archived")
  const createCommitment = useCreateCommitment()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("⚡")
  const [color, setColor] = useState<"green" | "indigo" | "amber">("green")
  const [periodDays, setPeriodDays] = useState(30)
  const [targetMin, setTargetMin] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return
    createCommitment.mutate(
      {
        name: name.trim(),
        emoji,
        color,
        period_days: periodDays,
        target_min_day: targetMin ? parseInt(targetMin) : undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false)
          setName("")
          setEmoji("⚡")
          setPeriodDays(30)
          setTargetMin("")
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Failed to create"),
      }
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Commitments</h1>
          <p className="text-sm text-slate-400 mt-1">Track recurring habits and long-term projects</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 mb-6">
          <p className="text-sm font-medium text-slate-50 mb-4">New commitment</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">Pick an emoji</p>
              <div className="flex flex-wrap gap-2">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      emoji === e ? "bg-indigo-500/20 ring-1 ring-indigo-500" : "bg-[#0A0A0F] hover:bg-[#16161F]"
                    }`}
                  >
                    {e}
                  </button>
                ))}
                <input
                  type="text"
                  value={EMOJI_PRESETS.includes(emoji) ? "" : emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(-2) || "⚡")}
                  placeholder="or type"
                  maxLength={2}
                  className="w-16 bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-9 px-2 text-sm text-center"
                />
              </div>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Commitment name (e.g. Go to gym)"
              maxLength={80}
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-10 px-3 text-sm"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-2">Duration</p>
                <div className="flex flex-wrap gap-1.5">
                  {PERIOD_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPeriodDays(p.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
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
              <div>
                <p className="text-xs text-slate-500 mb-2">Color</p>
                <div className="flex gap-2 mt-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-7 h-7 rounded-full ${c.cls} transition-transform ${
                        color === c.value ? "ring-2 ring-offset-2 ring-offset-[#111118] ring-white scale-110" : "opacity-60 hover:opacity-100"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Daily target</label>
              <input
                type="number"
                value={targetMin}
                onChange={(e) => setTargetMin(e.target.value)}
                min={1}
                placeholder="min/day (optional)"
                className="w-36 bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-9 px-3 text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createCommitment.isPending || !name.trim()}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium h-9 px-5 rounded-lg transition-colors"
              >
                {createCommitment.isPending ? "Creating…" : "Create commitment"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-200 text-sm h-9 px-4 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isPending ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 animate-pulse h-32" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-12 text-center">
          <p className="text-sm text-slate-400">No active commitments.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            Create your first →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((c: RecurringCommitment) => (
            <CommitmentCard key={c.id} commitment={c} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-400 transition-colors">
            Past commitments ({archived.length})
          </summary>
          <div className="space-y-3 mt-4">
            {archived.map((c: RecurringCommitment) => (
              <div key={c.id} className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-4 opacity-50">
                <div className="flex items-center gap-2">
                  <span>{c.emoji}</span>
                  <p className="text-sm text-slate-400">{c.name}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
