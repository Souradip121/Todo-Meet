"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Copy, Check, ArrowLeft, Play, Users } from "lucide-react"
import { useGroup, useLeaveGroup, useArchiveGroup, useDuoDetail } from "@/hooks/use-groups"
import { useCreateSession } from "@/hooks/use-sessions"
import { MemberGrid } from "@/components/features/groups/member-grid"
import { NudgeButton } from "@/components/features/groups/nudge-button"
import { useSession as useAuthSession } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"
import { useQuery } from "@tanstack/react-query"

const AVATAR_BG = ["#1A1814", "#1E3A5F", "#B91C1C", "#166534", "#92400E"]
function avatarColor(id: string) {
  let n = 0
  for (const c of id) n += c.charCodeAt(0)
  return AVATAR_BG[n % AVATAR_BG.length]
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

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

  const groupType = data?.group?.type as string | undefined
  const { data: duoData } = useDuoDetail(id, groupType)

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
      <div style={{ maxWidth: 640, margin: "0 auto" }} className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", height: "6rem", opacity: 0.5 }} className="animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.8rem", color: "var(--red-ink)" }}>Group not found.</p>
      </div>
    )
  }

  const { group, members, my_role } = data
  const currentUserId = auth?.user?.id
  const isDuo = groupType === "duo"

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Back */}
      <button
        onClick={() => router.push("/groups")}
        className="flex items-center gap-2 transition-colors"
        style={{
          fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
          color: "var(--ink-muted)", background: "none", border: "none",
          cursor: "pointer", letterSpacing: "0.05em", marginBottom: "1.5rem",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink)" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {isDuo ? "Duo" : "Groups"}
      </button>

      {isDuo ? (
        /* ── DUO DETAIL VIEW ── */
        <div className="space-y-4">
          {/* Duo hero */}
          <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "2rem 1.5rem", textAlign: "center" }}>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.5rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
              {group.title}
            </h1>

            {/* Two avatars + shared streak */}
            <div className="flex items-center justify-center gap-0">
              {duoData?.members.slice(0, 2).map((m, i) => (
                <div key={m.user_id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", zIndex: i === 0 ? 1 : 0 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: avatarColor(m.user_id),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem", fontWeight: 700,
                    color: "#fff", border: "3px solid var(--card-bg)",
                    marginLeft: i === 1 ? -12 : 0,
                  }}>
                    {initials(m.display_name)}
                  </div>
                  <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-muted)", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.display_name.split(" ")[0]}
                  </p>
                </div>
              ))}
              {/* Shared streak in middle */}
              {duoData && (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  background: "var(--paper)", border: "1.5px solid var(--card-border)",
                  padding: "0.5rem 1rem", marginLeft: duoData.members.length >= 2 ? -8 : 0,
                  zIndex: 2, position: "relative",
                }}>
                  <span style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.8rem", fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>
                    {duoData.duo_streak}
                  </span>
                  <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.55rem", letterSpacing: "0.1em", color: "var(--ink-faint)", marginTop: "0.2rem" }}>
                    SHARED STREAK
                  </span>
                </div>
              )}
            </div>

            {/* Today status */}
            {duoData && (
              <div style={{ marginTop: "1.25rem" }}>
                {duoData.both_logged_today ? (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                    background: "rgba(22,101,52,0.08)", border: "1px solid rgba(22,101,52,0.2)",
                    padding: "0.35rem 0.85rem",
                    fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--green-ink)",
                  }}>
                    <Check className="w-3 h-3" /> Both logged today
                  </div>
                ) : (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                    background: "rgba(146,64,14,0.08)", border: "1px solid rgba(146,64,14,0.2)",
                    padding: "0.35rem 0.85rem",
                    fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--amber-ink)",
                  }}>
                    Waiting for partner…
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Individual stats + recent days */}
          {duoData && duoData.members.length > 0 && (
            <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.25rem 1.5rem" }}>
              <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "1rem" }}>
                Individual Progress
              </p>
              <div className="space-y-4">
                {duoData.members.map((m) => {
                  const last14 = Array.from({ length: 14 }, (_, i) => {
                    const d = new Date()
                    d.setDate(d.getDate() - (13 - i))
                    return d.toISOString().slice(0, 10)
                  })
                  return (
                    <div key={m.user_id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: avatarColor(m.user_id),
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.55rem", color: "#fff",
                          }}>
                            {initials(m.display_name)}
                          </div>
                          <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem", color: "var(--ink)" }}>{m.display_name}</span>
                        </div>
                        <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink-muted)" }}>
                          {m.individual_streak}d streak
                        </span>
                      </div>
                      {/* 14-day dot row */}
                      <div className="flex gap-[3px]">
                        {last14.map((date) => {
                          const logged = m.recent_days.includes(date)
                          return (
                            <div
                              key={date}
                              title={date}
                              style={{
                                width: 14, height: 14,
                                background: logged ? "var(--green-ink)" : "var(--paper)",
                                border: `1px solid ${logged ? "var(--green-ink)" : "var(--card-border)"}`,
                                opacity: logged ? 1 : 0.5,
                              }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Invite code */}
          <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.25rem 1.5rem" }}>
            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
              Invite Code
            </p>
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "1.1rem", letterSpacing: "0.18em", color: "var(--ink)" }}>{group.invite_code}</span>
              <button
                onClick={copyInviteCode}
                className="flex items-center gap-1.5 transition-colors"
                style={{
                  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem",
                  color: "var(--ink-muted)", background: "var(--paper)",
                  border: "1px solid var(--card-border)", padding: "0.25rem 0.6rem", cursor: "pointer",
                }}
              >
                {copied ? <Check className="w-3 h-3" style={{ color: "var(--green-ink)" }} /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", color: "var(--ink-faint)", marginTop: "0.5rem" }}>
              Share with your partner to connect
            </p>
          </div>

          {/* Sessions */}
          {renderSessionsPanel()}

          {/* Actions */}
          {renderActions()}
        </div>
      ) : (
        /* ── GROUP DETAIL VIEW ── */
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.8rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>{group.title}</h1>
              {group.description && (
                <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", color: "var(--ink-muted)", marginTop: "0.3rem" }}>{group.description}</p>
              )}
            </div>
            {my_role === "host" && (
              <span style={{
                fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem",
                letterSpacing: "0.08em", textTransform: "uppercase",
                background: "rgba(185,28,28,0.06)", color: "var(--red-ink)",
                border: "1px solid rgba(185,28,28,0.2)", padding: "0.2rem 0.6rem",
              }}>
                Host
              </span>
            )}
          </div>

          {/* Invite code */}
          <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.25rem 1.5rem" }}>
            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
              Invite Code
            </p>
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "1.1rem", letterSpacing: "0.18em", color: "var(--ink)" }}>{group.invite_code}</span>
              <button
                onClick={copyInviteCode}
                className="flex items-center gap-1.5 transition-colors"
                style={{
                  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem",
                  color: "var(--ink-muted)", background: "var(--paper)",
                  border: "1px solid var(--card-border)", padding: "0.25rem 0.6rem", cursor: "pointer",
                }}
              >
                {copied ? <Check className="w-3 h-3" style={{ color: "var(--green-ink)" }} /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", color: "var(--ink-faint)", marginTop: "0.5rem" }}>
              Share this code with people you want to invite
            </p>
          </div>

          {/* Members */}
          <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.25rem 1.5rem" }}>
            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "1rem" }}>
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
          {renderSessionsPanel()}

          {/* Actions */}
          {renderActions()}
        </div>
      )}
    </div>
  )

  function renderSessionsPanel() {
    return (
      <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.25rem 1.5rem" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
            Sessions
          </p>
          {!showSessionForm && (
            <button
              onClick={() => setShowSessionForm(true)}
              className="flex items-center gap-1.5 transition-colors"
              style={{
                fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem",
                letterSpacing: "0.05em", background: "var(--ink)", color: "var(--paper)",
                border: "none", height: "1.8rem", padding: "0 0.75rem", cursor: "pointer",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--red-ink)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--ink)" }}
            >
              <Play className="w-3 h-3" /> Start session
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
                if (e.key === "Enter" && sessionTitle.trim()) createSession.mutate({ group_id: id, title: sessionTitle.trim() })
                if (e.key === "Escape") setShowSessionForm(false)
              }}
              placeholder="What are you working on?"
              style={{
                flex: 1, background: "var(--paper)", border: "1.5px solid var(--card-border)",
                color: "var(--ink)", fontFamily: "var(--font-lora), serif", fontSize: "0.9rem",
                height: "2.2rem", padding: "0 0.75rem", outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
            />
            <button
              onClick={() => sessionTitle.trim() && createSession.mutate({ group_id: id, title: sessionTitle.trim() })}
              disabled={!sessionTitle.trim() || createSession.isPending}
              style={{
                background: "var(--ink)", color: "var(--paper)", border: "none",
                fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem",
                height: "2.2rem", padding: "0 0.85rem", cursor: "pointer",
                opacity: !sessionTitle.trim() || createSession.isPending ? 0.5 : 1,
              }}
            >
              {createSession.isPending ? "…" : "Go"}
            </button>
            <button
              onClick={() => setShowSessionForm(false)}
              style={{ background: "none", color: "var(--ink-faint)", border: "none", cursor: "pointer", fontSize: "0.9rem" }}
            >✕</button>
          </div>
        )}

        {groupSessions && groupSessions.length > 0 ? (
          <div className="space-y-2">
            {groupSessions.map((sess) => (
              <a
                key={sess.id}
                href={`/sessions/${sess.id}`}
                className="flex items-center justify-between py-2 transition-colors"
                style={{ textDecoration: "none", padding: "0.4rem 0", borderBottom: "1px solid var(--rule)" }}
              >
                <div className="flex items-center gap-2">
                  {sess.status === "running" && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--red-ink)" }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--red-ink)" }} />
                    </span>
                  )}
                  <span style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", color: "var(--ink)" }}>{sess.title}</span>
                </div>
                <span style={{
                  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem",
                  color: sess.status === "running" ? "var(--red-ink)" : "var(--ink-faint)",
                  fontWeight: sess.status === "running" ? 600 : 400,
                }}>
                  {sess.status === "running" ? "Live — Join →" : sess.status}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2" style={{ color: "var(--ink-faint)" }}>
            <Users className="w-4 h-4" />
            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem" }}>No sessions yet. Start one to work together.</p>
          </div>
        )}
      </div>
    )
  }

  function renderActions() {
    return (
      <div className="flex gap-3">
        {my_role === "host" ? (
          <button
            onClick={handleArchive}
            disabled={archiveGroup.isPending}
            style={{
              fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
              letterSpacing: "0.05em", background: "rgba(185,28,28,0.06)",
              color: "var(--red-ink)", border: "1px solid rgba(185,28,28,0.2)",
              height: "2.1rem", padding: "0 1rem", cursor: "pointer",
              opacity: archiveGroup.isPending ? 0.5 : 1,
            }}
          >
            Archive {isDuo ? "duo" : "group"}
          </button>
        ) : (
          <button
            onClick={handleLeave}
            disabled={leaveGroup.isPending}
            style={{
              fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem",
              letterSpacing: "0.05em", background: "var(--card-bg)",
              color: "var(--ink-muted)", border: "1.5px solid var(--card-border)",
              height: "2.1rem", padding: "0 1rem", cursor: "pointer",
              opacity: leaveGroup.isPending ? 0.5 : 1,
            }}
          >
            Leave {isDuo ? "duo" : "group"}
          </button>
        )}
      </div>
    )
  }
}
