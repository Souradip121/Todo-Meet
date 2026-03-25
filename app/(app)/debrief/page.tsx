"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MoodSelector } from "@/components/features/debrief/mood-selector"
import { apiClient } from "@/lib/api-client"

export default function DebriefPage() {
  const router = useRouter()
  const [whatMoved, setWhatMoved] = useState("")
  const [whatDidnt, setWhatDidnt] = useState("")
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [checking, setChecking] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    apiClient.get(`/debriefs/${today}`).then((data) => {
      if (data) setAlreadyDone(true)
      setChecking(false)
    }).catch(() => setChecking(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await apiClient.post("/debriefs", {
        what_moved: whatMoved || null,
        what_didnt: whatDidnt || null,
        mood,
        energy,
      })
      setDone(true)
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-4xl">✓</div>
        <p className="text-slate-50 font-medium">Day closed.</p>
        <p className="text-sm text-slate-400">Your score will update at midnight.</p>
      </div>
    )
  }

  if (alreadyDone) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-50">Debrief</h1>
        </div>
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">Today&apos;s debrief is already submitted.</p>
          <a
            href="/dashboard"
            className="inline-block mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View dashboard →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-50">End of day.</h1>
        <p className="text-sm text-slate-400 mt-1">Close the loop. Be honest.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
              What moved today?
            </label>
            <textarea
              value={whatMoved}
              onChange={(e) => setWhatMoved(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="What actually got done? What clicked?"
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg px-3 py-2.5 text-sm resize-none"
            />
          </div>

          <div className="h-px bg-[#1E1E2E]" />

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
              What didn&apos;t?
            </label>
            <textarea
              value={whatDidnt}
              onChange={(e) => setWhatDidnt(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="What blocked you? What slipped?"
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg px-3 py-2.5 text-sm resize-none"
            />
          </div>

          <div className="h-px bg-[#1E1E2E]" />

          <div className="grid grid-cols-2 gap-6">
            <MoodSelector label="Mood" value={mood} onChange={setMood} />
            <MoodSelector label="Energy" value={energy} onChange={setEnergy} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium h-10 rounded-lg transition-colors text-sm"
        >
          {loading ? "Closing the day…" : "Close the day"}
        </button>
      </form>
    </div>
  )
}
