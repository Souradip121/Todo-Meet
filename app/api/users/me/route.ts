import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Return both better-auth names and legacy names for frontend compatibility
  return NextResponse.json({
    ...profile,
    display_name: profile.name,
    avatar_url: profile.image,
  })
}
