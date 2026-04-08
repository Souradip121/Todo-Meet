import { auth } from "./auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string | null
}

/**
 * Returns the authenticated user from the current request's session cookie.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

/**
 * Use at the top of API route handlers.
 * Returns { user, error: null } on success, or { user: null, error: Response } on failure.
 */
export async function requireAuth(): Promise<
  | { user: AuthUser; error: null }
  | { user: null; error: NextResponse }
> {
  const user = await getAuthUser()
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { user, error: null }
}
