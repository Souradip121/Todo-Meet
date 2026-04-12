"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Zap, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useFeed, useFriends, useFriendSearch, useSendFriendRequest, useAcceptFriendRequest, useRemoveFriend, useInspiredReaction } from "@/hooks/use-feed"
import type { FeedEvent } from "@/hooks/use-feed"

const AVATAR_COLORS = ["#1A1814", "#1E3A5F", "#B91C1C", "#166534", "#92400E"]

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function avatarColor(id: string) {
  let n = 0
  for (const c of id) n += c.charCodeAt(0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins} minute`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour`
}

function eventSummary(e: FeedEvent): { emoji: string; text: string; photo_url?: string | null } {
  switch (e.event_type) {
    case "log_time": {
      const p = e.payload as { commitment_name: string; commitment_emoji: string; duration_minutes: number; photo_url?: string | null }
      return {
        emoji: p.commitment_emoji ?? "⚡",
        text: `completed a ${fmtDuration(p.duration_minutes)} ${p.commitment_name} session`,
        photo_url: p.photo_url,
      }
    }
    case "challenge_checkin": {
      const p = e.payload as { challenge_title: string }
      return {
        emoji: "🔥",
        text: `checked into ${p.challenge_title}`,
      }
    }
    case "debrief_submitted": {
      const p = e.payload as { mood: number }
      return {
        emoji: "📓",
        text: `submitted their EOD debrief · mood ${p.mood}/5`,
      }
    }
    default:
      return { emoji: "📌", text: "did something" }
  }
}

function Avatar({ name, avatarUrl, userId }: { name: string; avatarUrl: string | null; userId: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: 38, height: 38, borderRadius: "50%", objectFit: "cover",
          flexShrink: 0, zIndex: 1, border: "2px solid var(--paper)",
        }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
      />
    )
  }
  return (
    <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarColor(userId), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", color: "#fff", flexShrink: 0, zIndex: 1, border: "2px solid var(--paper)" }}>
      {initials(name)}
    </div>
  )
}

function InspiredButton({ event }: { event: FeedEvent }) {
  const react = useInspiredReaction()
  const active = event.i_inspired

  return (
    <button
      onClick={() => react.mutate({ actor_id: event.actor_id, event_type: event.event_type, event_date: event.event_date })}
      disabled={react.isPending}
      style={{
        display: "flex", alignItems: "center", gap: "0.3rem",
        fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem",
        letterSpacing: "0.05em", padding: "0.2rem 0.6rem", cursor: react.isPending ? "not-allowed" : "pointer",
        background: active ? "rgba(185,28,28,0.08)" : "transparent",
        color: active ? "var(--red-ink)" : "var(--ink-faint)",
        border: `1px solid ${active ? "rgba(185,28,28,0.3)" : "var(--card-border)"}`,
        transition: "all 0.15s",
      }}
    >
      <Zap className="w-3 h-3" style={{ fill: active ? "currentColor" : "none" }} />
      inspired
      {event.inspired_count > 0 && (
        <span style={{ opacity: 0.8 }}>{event.inspired_count}</span>
      )}
    </button>
  )
}

export default function FeedPage() {
  const { data: events = [], isLoading: feedLoading } = useFeed()
  const { data: friends = [] } = useFriends()
  const [searchQ, setSearchQ] = useState("")
  const { data: searchResults = [] } = useFriendSearch(searchQ)
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const removeF = useRemoveFriend()

  const accepted = friends.filter((f) => f.status === "accepted")
  const pending = friends.filter((f) => f.status === "pending")

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "start" }}>
      {/* LEFT: feed */}
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--ink)" }}>Activity</h1>
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)", marginTop: "0.25rem", letterSpacing: "0.08em" }}>You + friends, last 7 days</p>
        </div>

        {feedLoading && (
          <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink-faint)" }}>Loading…</div>
        )}

        {!feedLoading && events.length === 0 && (
          <div style={{ background: "var(--card-bg)", border: "1.5px dashed var(--card-border)", padding: "2.5rem 2rem", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Nothing here yet</p>
            <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.88rem", color: "var(--ink-muted)" }}>Add friends to see their activity</p>
          </div>
        )}

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          {events.length > 0 && (
            <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 1, background: "var(--card-border)" }} />
          )}
          {events.map((e, i) => {
            const { emoji, text, photo_url } = eventSummary(e)
            return (
              <div key={`${e.actor_id}-${e.created_at}-${i}`} style={{ display: "flex", gap: "1rem", marginBottom: "1.2rem", position: "relative" }}>
                {/* Avatar */}
                <div style={{ flexShrink: 0, zIndex: 1 }}>
                  <Avatar name={e.display_name} avatarUrl={e.avatar_url} userId={e.actor_id} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "0.8rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", fontWeight: 500, color: "var(--ink)" }}>{e.display_name}</span>
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", color: "var(--ink-faint)" }}>@{e.username}</span>
                    <Link
                      href={`/profile`}
                      title={`View ${e.display_name}'s profile`}
                      style={{ marginLeft: "auto", color: "var(--ink-faint)", display: "flex", alignItems: "center" }}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.88rem", color: "var(--ink-muted)" }}>
                    <span style={{ marginRight: "0.4rem" }}>{emoji}</span>
                    {text}
                  </div>
                  {photo_url && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <img
                        src={photo_url}
                        alt="Proof"
                        onClick={() => window.open(photo_url, "_blank")}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "240px",
                          objectFit: "cover",
                          border: "1.5px solid var(--card-border)",
                          cursor: "pointer",
                          display: "block",
                        }}
                      />
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.6rem" }}>
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--ink-faint)" }}>
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </span>
                    <InspiredButton event={e} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT: friends panel */}
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>Friends</h2>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Search by username…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{ width: "100%", background: "var(--paper)", border: "1.5px solid var(--card-border)", color: "var(--ink)", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem", height: "2.2rem", padding: "0 0.65rem", outline: "none" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
          />
          {searchResults.length > 0 && (
            <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", borderTop: "none" }}>
              {searchResults.map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 0.8rem", borderBottom: "1px solid var(--card-border)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarColor(u.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.55rem", color: "#fff", flexShrink: 0 }}>
                    {initials(u.display_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.display_name}</div>
                    <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--ink-faint)" }}>@{u.username}</div>
                  </div>
                  {u.friendship_status === "none" && (
                    <button onClick={() => sendRequest.mutate(u.id)} style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", background: "var(--ink)", color: "var(--paper)", border: "none", padding: "0.25rem 0.6rem", cursor: "pointer" }}>
                      Add
                    </button>
                  )}
                  {u.friendship_status === "pending" && (
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--ink-faint)" }}>Pending</span>
                  )}
                  {u.friendship_status === "accepted" && (
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--green-ink)" }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending requests */}
        {pending.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.5rem" }}>Pending ({pending.length})</div>
            {pending.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 0", borderBottom: "1px solid var(--card-border)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarColor(f.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.55rem", color: "#fff" }}>
                  {initials(f.display_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink)" }}>{f.display_name}</div>
                </div>
                <button onClick={() => acceptRequest.mutate(f.id)} style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", background: "var(--green-ink)", color: "#fff", border: "none", padding: "0.25rem 0.6rem", cursor: "pointer" }}>
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        <div>
          <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.5rem" }}>
            Friends ({accepted.length})
          </div>
          {accepted.length === 0 && (
            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink-faint)" }}>No friends yet. Search above.</p>
          )}
          {accepted.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0", borderBottom: "1px solid var(--card-border)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarColor(f.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.55rem", color: "#fff" }}>
                {initials(f.display_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink)" }}>{f.display_name}</div>
                <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--ink-faint)" }}>@{f.username}</div>
              </div>
              <button onClick={() => removeF.mutate(f.id)} style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", background: "none", color: "var(--ink-faint)", border: "none", cursor: "pointer" }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
