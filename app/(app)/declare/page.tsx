"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { useDeclarationStore, useDeclarationActions } from "@/store/declaration"
import { CommitmentSlot } from "@/components/features/declaration/commitment-slot"
import { apiClient } from "@/lib/api-client"

export default function DeclarePage() {
  const router = useRouter()
  const commitments = useDeclarationStore((s) => s.commitments)
  const actions = useDeclarationActions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  // Redirect if already declared today
  useEffect(() => {
    apiClient.get("/declarations/today").then((data) => {
      if (data) router.replace("/commitments")
      else setChecking(false)
    }).catch(() => setChecking(false))
  }, [router])

  async function handleSubmit() {
    const filled = commitments.filter((c) => c.title.trim())
    if (filled.length === 0) {
      setError("Add at least 1 commitment")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await apiClient.post("/declarations", {
        commitments: filled.map(({ title, type, intensity, tag }) => ({
          title: title.trim(),
          type,
          intensity,
          tag,
        })),
      })
      actions.reset()
      router.push("/commitments")
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

  const canAdd = commitments.length < 3

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-50">Good morning.</h1>
        <p className="text-sm text-slate-400 mt-1">
          What are you committing to today? Max 3 things.
        </p>
      </div>

      <div className="space-y-4">
        {commitments.map((c, i) => (
          <CommitmentSlot
            key={c.id}
            index={i}
            commitment={c}
            canRemove={commitments.length > 1}
          />
        ))}

        {canAdd && (
          <button
            onClick={actions.addCommitment}
            className="w-full h-12 border border-dashed border-[#1E1E2E] rounded-xl text-slate-600 hover:text-slate-400 hover:border-[#2a2a3e] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add commitment
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-8">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium h-10 rounded-lg transition-colors text-sm"
        >
          {loading ? "Submitting…" : "Declare & start the day"}
        </button>
      </div>
    </div>
  )
}
