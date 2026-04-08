"use client"

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
})

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient

/**
 * Update the current user's profile fields.
 * Calls our own /api/users/profile route (not better-auth's endpoint).
 */
export async function updateProfile(body: {
  display_name?: string
  timezone?: string
  college_url?: string | null
  avatar_url?: string | null
  current_focus?: string | null
}) {
  const res = await fetch("/api/users/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed to update profile")
  return res.json()
}
