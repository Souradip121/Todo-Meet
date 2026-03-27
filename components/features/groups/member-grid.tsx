"use client"

import { SCORE_CLASSES } from "@/lib/constants"
import type { GroupMember } from "@/lib/types"

interface MemberWithScore extends GroupMember {
  today_score: number
}

interface MemberGridProps {
  members: MemberWithScore[]
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function MemberGrid({ members }: MemberGridProps) {
  if (!members || members.length === 0) {
    return (
      <p className="text-sm text-slate-400">No members yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div key={member.user_id} className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.display_name}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-medium text-indigo-400">
                {getInitials(member.display_name)}
              </span>
            )}
          </div>

          {/* Name */}
          <span className="text-sm text-slate-300 w-28 truncate shrink-0">
            {member.display_name}
          </span>

          {/* Today's score cell */}
          <div
            className={`w-5 h-5 rounded-sm ${SCORE_CLASSES[member.today_score ?? 0]}`}
            title={`${member.display_name} — today's score: ${member.today_score ?? 0}`}
          />

          {/* Score label */}
          <span className="text-xs text-slate-600 font-mono">
            {member.today_score ?? 0}/5
          </span>
        </div>
      ))}
    </div>
  )
}
