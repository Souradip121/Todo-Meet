import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { focusSessions, sessionMembers } from "@/lib/db/schema"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { title, duration_min, group_id } = body

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 422 })

  const [session] = await db
    .insert(focusSessions)
    .values({
      hostId:      user.id,
      groupId:     group_id ?? null,
      title,
      durationMin: duration_min ?? 25,
    })
    .returning()

  // Add host as first member
  await db.insert(sessionMembers).values({ sessionId: session.id, userId: user.id })

  return NextResponse.json({
    id:           session.id,
    title:        session.title,
    duration_min: session.durationMin,
    status:       session.status,
    group_id:     session.groupId,
  }, { status: 201 })
}
