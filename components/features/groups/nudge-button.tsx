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
      <span className="text-xs text-[var(--ink-faint)] px-2 py-1">
        Nudged
      </span>
    )
  }

  return (
    <button
      onClick={handleNudge}
      disabled={nudge.isPending}
      className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-hover)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--card-border)] px-2.5 py-1 rounded-lg transition-colors"
      title={`Nudge ${targetName}`}
    >
      {nudge.isPending ? "…" : "Nudge"}
    </button>
  )
}
