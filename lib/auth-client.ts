// Custom auth client — calls our Go API directly.
// Stores access_token in localStorage.

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"

function saveTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return
  localStorage.setItem("access_token", access)
  localStorage.setItem("refresh_token", refresh)
}

function clearTokens() {
  if (typeof window === "undefined") return
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("showup_user")
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

// ─── signUp ──────────────────────────────────────────────────────────────────

export const signUp = {
  email: async ({
    email,
    password,
    name,
    username,
  }: {
    email: string
    password: string
    name: string
    username?: string
  }) => {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        display_name: name,
        username: username ?? email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, ""),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Registration failed")
    saveTokens(data.access_token, data.refresh_token)

    // Fetch and cache the user profile
    const me = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    if (me.ok) {
      const user = await me.json()
      localStorage.setItem("showup_user", JSON.stringify(user))
    }
  },
}

// ─── signIn ──────────────────────────────────────────────────────────────────

export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Login failed")
    saveTokens(data.access_token, data.refresh_token)

    const me = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    if (me.ok) {
      const user = await me.json()
      localStorage.setItem("showup_user", JSON.stringify(user))
    }
  },
}

// ─── signOut ─────────────────────────────────────────────────────────────────

export async function signOut() {
  const token = getAccessToken()
  if (token) {
    fetch(`${BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }
  clearTokens()
}

// ─── useSession ──────────────────────────────────────────────────────────────
// Minimal hook — reads from localStorage, no server round-trip.

import { useState, useEffect } from "react"

interface SessionUser {
  id: string
  email: string
  username: string
  display_name: string
  name: string // alias for display_name, used by components
}

interface Session {
  user: SessionUser | null
}

export function useSession(): { data: Session | null; isPending: boolean } {
  const [data, setData] = useState<Session | null>(null)
  const [isPending, setIsPending] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    const cached = localStorage.getItem("showup_user")

    if (!token) {
      setData(null)
      setIsPending(false)
      return
    }

    // Use cached session immediately — don't block on network
    let hasCached = false
    if (cached) {
      try {
        const user = JSON.parse(cached)
        setData({ user: { ...user, name: user.display_name } })
        hasCached = true
      } catch {}
    }
    // Only resolve immediately if we already have a cached user.
    // Otherwise keep isPending=true so the layout waits for the fetch below
    // and doesn't prematurely redirect to /login.
    if (hasCached) setIsPending(false)

    // Background refresh — only clear on explicit 401, ignore network errors
    fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          clearTokens()
          setData(null)
          setIsPending(false)
          return null
        }
        if (r.ok) return r.json()
        // Non-401 error (404, 500, etc.) — don't clear session, just stop pending
        if (!hasCached) setIsPending(false)
        return null
      })
      .then((user) => {
        if (!user) return
        localStorage.setItem("showup_user", JSON.stringify(user))
        setData({ user: { ...user, name: user.display_name } })
        if (!hasCached) setIsPending(false)
      })
      .catch(() => {
        // Network error — keep cached session, don't redirect
        if (!hasCached) setIsPending(false)
      })
  }, [])

  return { data, isPending }
}
