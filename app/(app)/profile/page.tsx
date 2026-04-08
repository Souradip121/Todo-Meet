"use client"

import { useState, useEffect } from "react"
import { useProfile, useUpdateProfile } from "@/hooks/use-profile"
import { useChallenges } from "@/hooks/use-challenges"
import { useFriends, useFriendSearch, useSendFriendRequest, useAcceptFriendRequest, useRemoveFriend } from "@/hooks/use-feed"
import { Check, Pencil, X } from "lucide-react"

const AVATAR_COLORS = ["#1A1814", "#1E3A5F", "#B91C1C", "#166534", "#92400E"]

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}
function avatarColor(id: string) {
  let n = 0
  for (const c of id) n += c.charCodeAt(0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem",
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-faint)",
  display: "block", marginBottom: "0.35rem",
}
const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--paper)", border: "1.5px solid var(--card-border)",
  color: "var(--ink)", fontFamily: "var(--font-lora), serif", fontSize: "0.88rem",
  height: "2.4rem", padding: "0 0.7rem", outline: "none",
}

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const { data: friends = [] } = useFriends()
  const [searchQ, setSearchQ] = useState("")
  const [collegeSearchFilter, setCollegeSearchFilter] = useState(false)
  const { data: searchResults = [] } = useFriendSearch(searchQ, collegeSearchFilter)
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const removeF = useRemoveFriend()

  // College filter for challenges
  const [collegeFilter, setCollegeFilter] = useState(false)
  const { data: challenges = [] } = useChallenges()

  // Editable fields
  const [displayName, setDisplayName] = useState("")
  const [collegeURL, setCollegeURL] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [editingCollege, setEditingCollege] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name)
      setCollegeURL(profile.college_url ?? "")
    }
  }, [profile])

  async function save(field: "display_name" | "college_url") {
    setSaving(true)
    try {
      await updateProfile.mutateAsync(
        field === "display_name"
          ? { display_name: displayName }
          : { college_url: collegeURL || null }
      )
      setEditingName(false)
      setEditingCollege(false)
    } finally {
      setSaving(false)
    }
  }

  const accepted = friends.filter((f) => f.status === "accepted")
  const pending = friends.filter((f) => f.status === "pending")

  const filteredChallenges = collegeFilter && profile?.college_url
    ? challenges.filter(() => true) // future: filter by college
    : challenges

  if (isLoading) {
    return <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink-faint)" }}>Loading…</div>
  }
  if (!profile) return null

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Profile card */}
      <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.8rem", marginBottom: "1.6rem" }}>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
          {/* Avatar */}
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: avatarColor(profile.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "1.1rem", color: "#fff", flexShrink: 0 }}>
            {initials(profile.display_name)}
          </div>

          <div style={{ flex: 1 }}>
            {/* Display name */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Display name</label>
              {editingName ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input autoFocus value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") save("display_name"); if (e.key === "Escape") setEditingName(false) }}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
                  />
                  <button onClick={() => save("display_name")} disabled={saving} style={{ background: "var(--ink)", color: "var(--paper)", border: "none", width: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingName(false)} style={{ background: "none", border: "1.5px solid var(--card-border)", width: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--ink)" }}>{profile.display_name}</span>
                  <button onClick={() => setEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", padding: 0 }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink-faint)", marginTop: "0.2rem" }}>@{profile.username} · {profile.email}</p>
            </div>

            {/* College URL */}
            <div>
              <label style={labelStyle}>College / Institution URL</label>
              {editingCollege ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input autoFocus value={collegeURL} onChange={(e) => setCollegeURL(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") save("college_url"); if (e.key === "Escape") setEditingCollege(false) }}
                    placeholder="https://iitk.ac.in"
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
                  />
                  <button onClick={() => save("college_url")} disabled={saving} style={{ background: "var(--ink)", color: "var(--paper)", border: "none", width: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingCollege(false)} style={{ background: "none", border: "1.5px solid var(--card-border)", width: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  {profile.college_url ? (
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--ink)", background: "var(--paper)", border: "1px solid var(--card-border)", padding: "0.2rem 0.6rem" }}>{profile.college_url}</span>
                  ) : (
                    <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--ink-faint)" }}>Not set</span>
                  )}
                  <button onClick={() => setEditingCollege(true)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", padding: 0 }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--ink-faint)", marginTop: "0.3rem" }}>Used to filter challenges by your institution</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Challenges (with college filter) */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
            <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Challenges</div>
            {profile.college_url && (
              <button
                onClick={() => setCollegeFilter((v) => !v)}
                style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.06em", background: collegeFilter ? "var(--ink)" : "transparent", color: collegeFilter ? "var(--paper)" : "var(--ink-muted)", border: "1px solid var(--card-border)", padding: "0.22rem 0.6rem", cursor: "pointer" }}
              >
                My college only
              </button>
            )}
          </div>
          <div style={{ border: "1.5px solid var(--card-border)" }}>
            {filteredChallenges.slice(0, 5).map((c, i) => (
              <a key={c.id} href="/challenges" style={{ display: "block", padding: "0.8rem 1rem", borderBottom: i < filteredChallenges.length - 1 ? "1px solid var(--card-border)" : "none", textDecoration: "none" }}>
                <div style={{ fontFamily: "var(--font-playfair), serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.15rem" }}>{c.title}</div>
                <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "var(--ink-faint)" }}>
                  {c.participant_count} joined · {c.days_remaining} days left
                </div>
              </a>
            ))}
            {filteredChallenges.length === 0 && (
              <div style={{ padding: "1.2rem 1rem", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.7rem", color: "var(--ink-faint)" }}>No challenges found</div>
            )}
          </div>
        </div>

        {/* Friends */}
        <div>
          <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.9rem" }}>Friends</div>

          {/* Search */}
          <input
            type="text"
            placeholder="Find people…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{ ...inputStyle, marginBottom: "0.4rem" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
          />
          {profile.college_url && (
            <div style={{ marginBottom: "0.5rem" }}>
              <button
                onClick={() => setCollegeSearchFilter((v) => !v)}
                style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.06em", background: collegeSearchFilter ? "var(--ink)" : "transparent", color: collegeSearchFilter ? "var(--paper)" : "var(--ink-muted)", border: "1px solid var(--card-border)", padding: "0.22rem 0.6rem", cursor: "pointer" }}
              >
                Same college only
              </button>
            </div>
          )}

          {searchResults.length > 0 && (
            <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", borderTop: "none", marginBottom: "0.8rem" }}>
              {searchResults.map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.7rem", borderBottom: "1px solid var(--card-border)" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: avatarColor(u.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.52rem", color: "#fff" }}>
                    {initials(u.display_name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", color: "var(--ink)" }}>{u.display_name}</div>
                  </div>
                  {u.friendship_status === "none" && (
                    <button onClick={() => sendRequest.mutate(u.id)} style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", background: "var(--ink)", color: "var(--paper)", border: "none", padding: "0.2rem 0.55rem", cursor: "pointer" }}>
                      Add
                    </button>
                  )}
                  {u.friendship_status === "pending" && <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", color: "var(--ink-faint)" }}>Pending</span>}
                  {u.friendship_status === "accepted" && <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", color: "var(--green-ink)" }}>✓</span>}
                </div>
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div style={{ marginBottom: "0.8rem" }}>
              <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--red-ink)", marginBottom: "0.4rem" }}>Requests ({pending.length})</div>
              {pending.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 0", borderBottom: "1px solid var(--card-border)" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: avatarColor(f.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.52rem", color: "#fff" }}>
                    {initials(f.display_name)}
                  </div>
                  <div style={{ flex: 1, fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", color: "var(--ink)" }}>{f.display_name}</div>
                  <button onClick={() => acceptRequest.mutate(f.id)} style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", background: "var(--green-ink)", color: "#fff", border: "none", padding: "0.2rem 0.5rem", cursor: "pointer" }}>
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.4rem" }}>
            {accepted.length} friend{accepted.length !== 1 ? "s" : ""}
          </div>
          {accepted.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 0", borderBottom: "1px solid var(--card-border)" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: avatarColor(f.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.52rem", color: "#fff" }}>
                {initials(f.display_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", color: "var(--ink)" }}>{f.display_name}</div>
              </div>
              <button onClick={() => removeF.mutate(f.id)} style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", background: "none", color: "var(--ink-faint)", border: "none", cursor: "pointer" }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
