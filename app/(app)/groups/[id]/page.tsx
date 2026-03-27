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
          <div key={i} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 animate-pulse h-24" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-[var(--red-ink)]">Group not found.</p>
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
        className="flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Groups
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--ink)]">{group.title}</h1>
          {group.description && (
            <p className="text-sm text-[var(--ink-muted)] mt-1">{group.description}</p>
          )}
        </div>
        {my_role === "host" && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-[rgba(185,28,28,0.06)] text-[var(--red-ink)] border border-[rgba(185,28,28,0.2)] shrink-0">
            Host
          </span>
        )}
      </div>

      {/* Invite code */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-4">
        <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider mb-3">Invite Code</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg text-[var(--ink)] tracking-widest">{group.invite_code}</span>
          <button
            onClick={copyInviteCode}
            className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--card-border)] hover:bg-[var(--paper-hover)] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-[var(--green-ink)]" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-[var(--ink-faint)] mt-2">Share this code with people you want to invite</p>
      </div>

      {/* Members */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-4">
        <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider mb-4">
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
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider">Sessions</p>
          {!showSessionForm && (
            <button
              onClick={() => setShowSessionForm(true)}
              className="flex items-center gap-1.5 text-xs bg-[var(--ink)] hover:bg-[var(--red-ink)] text-white font-medium h-7 px-3 rounded-lg transition-colors"
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
              className="flex-1 bg-[var(--paper)] border border-[var(--card-border)] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(185,28,28,0.5)] focus:outline-none rounded-lg h-9 px-3 text-sm"
            />
            <button
              onClick={() => sessionTitle.trim() && createSession.mutate({ group_id: id, title: sessionTitle.trim() })}
              disabled={!sessionTitle.trim() || createSession.isPending}
              className="bg-[var(--ink)] hover:bg-[var(--red-ink)] disabled:opacity-50 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
            >
              {createSession.isPending ? "…" : "Go"}
            </button>
            <button onClick={() => setShowSessionForm(false)} className="text-[var(--ink-faint)] hover:text-[var(--ink-muted)] h-9 px-2">
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
                className="flex items-center justify-between py-2 hover:bg-[var(--paper-hover)] rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {sess.status === "running" && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--ink)]" />
                    </span>
                  )}
                  <span className="text-sm text-[var(--ink)]">{sess.title}</span>
                </div>
                <span className={`text-xs ${sess.status === "running" ? "text-[var(--red-ink)] font-medium" : "text-[var(--ink-faint)]"}`}>
                  {sess.status === "running" ? "Live — Join →" : sess.status}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[var(--ink-faint)]">
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
            className="text-sm bg-[rgba(185,28,28,0.06)] hover:bg-[rgba(185,28,28,0.1)] text-[var(--red-ink)] border border-[rgba(185,28,28,0.2)] disabled:opacity-50 h-9 px-4 rounded-lg transition-colors"
          >
            Archive group
          </button>
        ) : (
          <button
            onClick={handleLeave}
            disabled={leaveGroup.isPending}
            className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-hover)] border border-[var(--card-border)] disabled:opacity-50 h-9 px-4 rounded-lg transition-colors"
          >
            Leave group
          </button>
        )}
      </div>
    </div>
  )
}
