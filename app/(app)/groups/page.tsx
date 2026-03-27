"use client"

import { useState } from "react"
import Link from "next/link"
import { Users, Plus, LogIn } from "lucide-react"
import { useGroups, useCreateGroup, useJoinGroup } from "@/hooks/use-groups"
import type { GroupCommitment } from "@/lib/types"

export default function GroupsPage() {
  const { data: groups, isPending } = useGroups()
  const createGroup = useCreateGroup()
  const joinGroup = useJoinGroup()

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [durationDays, setDurationDays] = useState(30)
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    createGroup.mutate(
      { title, description, duration_days: durationDays },
      {
        onSuccess: () => {
          setShowCreate(false)
          setTitle("")
          setDescription("")
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Failed to create"),
      }
    )
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    joinGroup.mutate(inviteCode.trim(), {
      onSuccess: () => {
        setShowJoin(false)
        setInviteCode("")
      },
      onError: (err) => setError(err instanceof Error ? err.message : "Invalid code"),
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--ink)]">Groups</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">Accountability pods — show up together</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); setError(null) }}
            className="flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-hover)] border border-[var(--card-border)] px-3 h-9 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Join
          </button>
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); setError(null) }}
            className="flex items-center gap-2 text-sm bg-[var(--ink)] hover:bg-[var(--red-ink)] text-white font-medium px-3 h-9 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New group
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-6">
          <p className="text-sm font-medium text-[var(--ink)] mb-4">Create a group</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              placeholder="Group name"
              className="w-full bg-[var(--paper)] border border-[var(--card-border)] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(185,28,28,0.5)] focus:outline-none rounded-lg h-10 px-3 text-sm"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you all committing to? (optional)"
              className="w-full bg-[var(--paper)] border border-[var(--card-border)] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(185,28,28,0.5)] focus:outline-none rounded-lg h-10 px-3 text-sm"
            />
            <div className="flex items-center gap-3">
              <label className="text-xs text-[var(--ink-muted)] whitespace-nowrap">Duration (days)</label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                min={1}
                max={365}
                className="w-24 bg-[var(--paper)] border border-[var(--card-border)] text-[var(--ink)] focus:border-[rgba(185,28,28,0.5)] focus:outline-none rounded-lg h-10 px-3 text-sm"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--red-ink)] bg-[rgba(185,28,28,0.06)] border border-[rgba(185,28,28,0.2)] rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createGroup.isPending}
                className="bg-[var(--ink)] hover:bg-[var(--red-ink)] disabled:opacity-50 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
              >
                {createGroup.isPending ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] h-9 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-6">
          <p className="text-sm font-medium text-[var(--ink)] mb-4">Join with invite code</p>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              placeholder="8-character invite code"
              className="w-full bg-[var(--paper)] border border-[var(--card-border)] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(185,28,28,0.5)] focus:outline-none rounded-lg h-10 px-3 text-sm font-mono tracking-widest"
            />
            {error && (
              <p className="text-sm text-[var(--red-ink)] bg-[rgba(185,28,28,0.06)] border border-[rgba(185,28,28,0.2)] rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={joinGroup.isPending}
                className="bg-[var(--ink)] hover:bg-[var(--red-ink)] disabled:opacity-50 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
              >
                {joinGroup.isPending ? "Joining…" : "Join"}
              </button>
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] h-9 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups list */}
      {isPending ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 animate-pulse h-20" />
          ))}
        </div>
      ) : !groups || groups.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-12 flex flex-col items-center gap-3">
          <Users className="w-8 h-8 text-[var(--ink-faint)]" />
          <p className="text-sm text-[var(--ink-muted)]">No groups yet.</p>
          <p className="text-xs text-[var(--ink-faint)]">Create one or join with an invite code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group: GroupCommitment) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[rgba(185,28,28,0.3)] rounded-xl p-6 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{group.title}</p>
                  {group.description && (
                    <p className="text-xs text-[var(--ink-muted)] mt-1">{group.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-[var(--ink-faint)]">{group.duration_days}d</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
