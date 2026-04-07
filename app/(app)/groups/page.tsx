"use client"

import { useState } from "react"
import Link from "next/link"
import { Users, Plus, LogIn, UserPlus } from "lucide-react"
import { useGroups, useCreateGroup, useJoinGroup } from "@/hooks/use-groups"
import type { GroupCommitment } from "@/lib/types"

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

export default function GroupsPage() {
  const { data: groups, isPending } = useGroups()
  const createGroup = useCreateGroup()
  const joinGroup = useJoinGroup()

  const [activeTab, setActiveTab] = useState<"groups" | "duo">("groups")
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [durationDays, setDurationDays] = useState(30)
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  const groupList = groups?.filter((g: GroupCommitment) => g.type === "group") ?? []
  const duoList = groups?.filter((g: GroupCommitment) => g.type === "duo") ?? []
  const filtered = activeTab === "groups" ? groupList : duoList

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    createGroup.mutate(
      {
        title,
        description,
        duration_days: activeTab === "duo" ? 0 : durationDays,
        type: activeTab === "groups" ? "group" : "duo",
      },
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

  function openCreate() {
    setShowCreate(true)
    setShowJoin(false)
    setError(null)
  }

  function openJoin() {
    setShowJoin(true)
    setShowCreate(false)
    setError(null)
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-start justify-between" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Groups
          </h1>
          <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", color: "var(--ink-muted)", marginTop: "0.3rem" }}>
            Accountability pods — show up together
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openJoin}
            className="flex items-center gap-2 transition-colors"
            style={{
              fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
              letterSpacing: "0.04em", height: "2.1rem", padding: "0 0.85rem",
              background: "var(--card-bg)", border: "1.5px solid var(--card-border)",
              color: "var(--ink-muted)", cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)" }}
          >
            <LogIn className="w-3.5 h-3.5" /> join
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 transition-colors"
            style={{
              fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
              letterSpacing: "0.04em", height: "2.1rem", padding: "0 0.85rem",
              background: "var(--ink)", border: "1.5px solid var(--ink)",
              color: "var(--paper)", cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--red-ink)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--red-ink)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--ink)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--ink)" }}
          >
            <Plus className="w-3.5 h-3.5" /> new {activeTab === "duo" ? "duo" : "group"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1.5px solid var(--card-border)", marginBottom: "1.5rem" }}>
        {(["groups", "duo"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setShowCreate(false); setShowJoin(false); setError(null) }}
            style={{
              fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
              letterSpacing: "0.1em", textTransform: "lowercase",
              padding: "0 1.25rem", height: "2.4rem",
              background: "none", border: "none", cursor: "pointer",
              color: activeTab === tab ? "var(--red-ink)" : "var(--ink-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--red-ink)" : "2px solid transparent",
              marginBottom: "-1.5px",
              transition: "color 0.15s",
            }}
          >
            {tab === "groups" ? (
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Groups {groupList.length > 0 && `(${groupList.length})`}</span>
            ) : (
              <span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Duo {duoList.length > 0 && `(${duoList.length})`}</span>
            )}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.5rem", marginBottom: "1.25rem" }}>
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "1rem" }}>
            Create a {activeTab === "duo" ? "duo" : "group"}
          </p>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              placeholder={activeTab === "duo" ? "e.g. Code streak with Alex" : "Group name"}
              style={{
                width: "100%", background: "var(--paper)", border: "1.5px solid var(--card-border)",
                color: "var(--ink)", fontFamily: "var(--font-lora), serif", fontSize: "0.9rem",
                height: "2.5rem", padding: "0 0.75rem", outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={activeTab === "duo" ? "What are you both committing to? (optional)" : "What is everyone committing to? (optional)"}
              style={{
                width: "100%", background: "var(--paper)", border: "1.5px solid var(--card-border)",
                color: "var(--ink)", fontFamily: "var(--font-lora), serif", fontSize: "0.9rem",
                height: "2.5rem", padding: "0 0.75rem", outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
            />
            {activeTab === "groups" && (
              <div className="flex items-center gap-3">
                <label style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>Duration (days)</label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  style={{
                    width: "5rem", background: "var(--paper)", border: "1.5px solid var(--card-border)",
                    color: "var(--ink)", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.85rem",
                    height: "2.5rem", padding: "0 0.75rem", outline: "none",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
                />
              </div>
            )}
            {activeTab === "duo" && (
              <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)", letterSpacing: "0.05em" }}>
                Duos are open-ended — no fixed end date
              </p>
            )}
            {error && (
              <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--red-ink)", background: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.2)", padding: "0.5rem 0.75rem" }}>{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createGroup.isPending}
                style={{
                  background: "var(--ink)", color: "var(--paper)", border: "none",
                  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
                  letterSpacing: "0.05em", height: "2.1rem", padding: "0 1rem",
                  cursor: createGroup.isPending ? "not-allowed" : "pointer",
                  opacity: createGroup.isPending ? 0.6 : 1,
                }}
              >
                {createGroup.isPending ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  background: "none", color: "var(--ink-muted)", border: "none",
                  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.5rem", marginBottom: "1.25rem" }}>
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "1rem" }}>
            Join with invite code
          </p>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              placeholder="8-character invite code"
              style={{
                width: "100%", background: "var(--paper)", border: "1.5px solid var(--card-border)",
                color: "var(--ink)", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.9rem",
                height: "2.5rem", padding: "0 0.75rem", outline: "none",
                letterSpacing: "0.12em", boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
            />
            {error && (
              <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--red-ink)", background: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.2)", padding: "0.5rem 0.75rem" }}>{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={joinGroup.isPending}
                style={{
                  background: "var(--ink)", color: "var(--paper)", border: "none",
                  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
                  letterSpacing: "0.05em", height: "2.1rem", padding: "0 1rem",
                  cursor: joinGroup.isPending ? "not-allowed" : "pointer",
                  opacity: joinGroup.isPending ? 0.6 : 1,
                }}
              >
                {joinGroup.isPending ? "Joining…" : "Join"}
              </button>
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                style={{
                  background: "none", color: "var(--ink-muted)", border: "none",
                  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {isPending ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", height: "5rem", opacity: 0.5 }} className="animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1.5px dashed var(--card-border)", padding: "3rem 2rem", textAlign: "center" }}>
          {activeTab === "duo" ? (
            <>
              <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>No duo yet</p>
              <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.88rem", color: "var(--ink-muted)" }}>Create a duo and share the invite code with your accountability partner.</p>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>No groups yet</p>
              <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.88rem", color: "var(--ink-muted)" }}>Create one or join with an invite code.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((group: GroupCommitment) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "var(--card-bg)", border: "1.5px solid var(--card-border)",
                  padding: "1.25rem 1.5rem", cursor: "pointer", transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(185,28,28,0.3)" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--card-border)" }}
              >
                <div className="flex items-start justify-between">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>{group.title}</p>
                    {group.description && (
                      <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.85rem", color: "var(--ink-muted)", marginTop: "0.2rem" }}>{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {/* Member count avatars */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(group.member_count ?? 1, 4) }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: 24, height: 24, borderRadius: "50%",
                            background: "var(--ink)", display: "flex", alignItems: "center",
                            justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace",
                            fontSize: "0.5rem", color: "var(--paper)",
                            border: "2px solid var(--card-bg)",
                            marginLeft: i > 0 ? -8 : 0,
                          }}
                        >
                          {i === 0 ? "·" : "·"}
                        </div>
                      ))}
                    </div>
                    <div className="text-right">
                      <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)", letterSpacing: "0.05em" }}>
                        {group.type === "duo" ? "duo" : `${group.member_count ?? 1} members`}
                      </p>
                      {group.type === "group" && group.duration_days > 0 && (
                        <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", color: "var(--ink-faint)" }}>{group.duration_days}d</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--rule)" }}>
                  <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
                    {group.invite_code}
                  </span>
                  <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--ink-faint)" }}>
                    {group.role === "host" ? "host" : "member"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
