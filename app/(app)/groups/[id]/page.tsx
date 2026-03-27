"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Copy, Check, ArrowLeft, Play, Users } from "lucide-react"
import { useGroup, useLeaveGroup, useArchiveGroup } from "@/hooks/use-groups"
import { useCreateSession } from "@/hooks/use-sessions"
import { MemberGrid } from "@/components/features/groups/member-grid"
import { NudgeButton } from "@/components/features/groups/nudge-button"
import { useSession as useAuthSession } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"
import { useQuery } from "@tanstack/react-query"

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: auth } = useAuthSession()
  const { data, isPending, error } = useGroup(id)
  const leaveGroup = useLeaveGroup()
  const archiveGroup = useArchiveGroup()
  const createSession = useCreateSession()
  const [copied, setCopied] = useState(false)
  const [sessionTitle, setSessionTitle] = useState("")
  const [showSessionForm, setShowSessionForm] = useState(false)

  const { data: groupSessions } = useQuery({
    queryKey: ["group-sessions", id],
    queryFn: () => apiClient.get<{ id: string; title: string; status: string; member_count?: number; started_at: string | null }[]>(`/groups/${id}/sessions`),
    staleTime: 1000 * 30,
  })

  function copyInviteCode() {
    if (!data) return
    navigator.clipboard.writeText(data.group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleLeave() {
    if (!confirm("Leave this group?")) return
    leaveGroup.mutate(id, { onSuccess: () => router.push("/groups") })
  }

  function handleArchive() {
    if (!confirm("Archive this group? This cannot be undone.")) return
    archiveGroup.mutate(id, { onSuccess: () => router.push("/groups") })
  }

  if (isPending) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 animate-pulse h-24" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-red-400">Group not found.</p>
      </div>
    )
  }

  const { group, members, my_role } = data
  const currentUserId = auth?.user?.id

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/groups")}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-50 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Groups
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">{group.title}</h1>
          {group.description && (
            <p className="text-sm text-slate-400 mt-1">{group.description}</p>
          )}
        </div>
        {my_role === "host" && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            Host
          </span>
        )}
      </div>

      {/* Invite code */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 mb-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Invite Code</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg text-slate-50 tracking-widest">{group.invite_code}</span>
          <button
            onClick={copyInviteCode}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-50 border border-[#1E1E2E] hover:bg-[#16161F] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2">Share this code with people you want to invite</p>
      </div>

      {/* Members */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 mb-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
          Members · {members.length}
        </p>
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between">
              <MemberGrid members={[member]} />
              {member.user_id !== currentUserId && member.today_score === 0 && (
                <NudgeButton
                  groupId={id}
                  targetUserId={member.user_id}
                  targetName={member.display_name}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sessions</p>
          {!showSessionForm && (
            <button
              onClick={() => setShowSessionForm(true)}
              className="flex items-center gap-1.5 text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-medium h-7 px-3 rounded-lg transition-colors"
            >
              <Play className="w-3 h-3" />
              Start session
            </button>
          )}
        </div>

        {showSessionForm && (
          <div className="flex items-center gap-2 mb-4">
            <input
              autoFocus
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sessionTitle.trim()) {
                  createSession.mutate({ group_id: id, title: sessionTitle.trim() })
                }
                if (e.key === "Escape") setShowSessionForm(false)
              }}
              placeholder="What are you working on?"
              className="flex-1 bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-9 px-3 text-sm"
            />
            <button
              onClick={() => sessionTitle.trim() && createSession.mutate({ group_id: id, title: sessionTitle.trim() })}
              disabled={!sessionTitle.trim() || createSession.isPending}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
            >
              {createSession.isPending ? "…" : "Go"}
            </button>
            <button onClick={() => setShowSessionForm(false)} className="text-slate-600 hover:text-slate-400 h-9 px-2">
              ✕
            </button>
          </div>
        )}

        {groupSessions && groupSessions.length > 0 ? (
          <div className="space-y-2">
            {groupSessions.map((sess) => (
              <a
                key={sess.id}
                href={`/sessions/${sess.id}`}
                className="flex items-center justify-between py-2 hover:bg-[#16161F] rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {sess.status === "running" && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                    </span>
                  )}
                  <span className="text-sm text-slate-300">{sess.title}</span>
                </div>
                <span className={`text-xs ${sess.status === "running" ? "text-indigo-400 font-medium" : "text-slate-600"}`}>
                  {sess.status === "running" ? "Live — Join →" : sess.status}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4" />
            <p className="text-sm">No sessions yet. Start one to work together.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {my_role === "host" ? (
          <button
            onClick={handleArchive}
            disabled={archiveGroup.isPending}
            className="text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-50 h-9 px-4 rounded-lg transition-colors"
          >
            Archive group
          </button>
        ) : (
          <button
            onClick={handleLeave}
            disabled={leaveGroup.isPending}
            className="text-sm text-slate-400 hover:text-slate-50 hover:bg-[#16161F] border border-[#1E1E2E] disabled:opacity-50 h-9 px-4 rounded-lg transition-colors"
          >
            Leave group
          </button>
        )}
      </div>
    </div>
  )
}
