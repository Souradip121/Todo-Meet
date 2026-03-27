"use client"

import { useState } from "react"
import { useNudge } from "@/hooks/use-groups"

interface NudgeButtonProps {
  groupId: string
  targetUserId: string
  targetName: string
}

export function NudgeButton({ groupId, targetUserId, targetName }: NudgeButtonProps) {
  const [sent, setSent] = useState(false)
  const nudge = useNudge(groupId)

  function handleNudge() {
    nudge.mutate(targetUserId, {
      onSuccess: () => setSent(true),
    })
  }

  if (sent) {
    return (
      <span className="text-xs text-slate-600 px-2 py-1">
        Nudged
      </span>
    )
  }

  return (
    <button
      onClick={handleNudge}
      disabled={nudge.isPending}
      className="text-xs text-slate-400 hover:text-slate-50 hover:bg-[#16161F] disabled:opacity-40 disabled:cursor-not-allowed border border-[#1E1E2E] px-2.5 py-1 rounded-lg transition-colors"
      title={`Nudge ${targetName}`}
    >
      {nudge.isPending ? "…" : "Nudge"}
    </button>
  )
}
