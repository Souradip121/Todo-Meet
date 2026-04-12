import { NextRequest, NextResponse } from "next/server"
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

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    ...profile,
    display_name: profile.name,
    avatar_url: profile.image,
  })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  // Accept both legacy and new field names
  if (body.display_name !== undefined || body.name !== undefined) {
    updates.name = body.display_name ?? body.name
  }
  if (body.avatar_url !== undefined || body.image !== undefined) {
    updates.image = body.avatar_url ?? body.image
  }
  if (body.timezone !== undefined)     updates.timezone = body.timezone
  if (body.college_url !== undefined)  updates.collegeUrl = body.college_url
  if (body.college !== undefined)      updates.college = body.college
  if (body.current_focus !== undefined) updates.currentFocus = body.current_focus

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const [updated] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning()

  return NextResponse.json({
    ...updated,
    display_name: updated.name,
    avatar_url: updated.image,
  })
}
