import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { challengeCheckins, challengeParticipants } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const today = new Date().toISOString().split("T")[0]

  try {
    await db.insert(challengeCheckins).values({
      challengeId: id,
      userId:      user.id,
      date:        today,
      photoUrl:    body.photo_url ?? null,
    })
  } catch {
    return NextResponse.json({ error: "Already checked in today" }, { status: 409 })
  }

  // Update participant streak counters
  await db.execute(sql`
    UPDATE challenge_participants
    SET
      total_checkins = total_checkins + 1,
      current_streak = CASE
        WHEN last_checkin_date = CURRENT_DATE - 1 THEN current_streak + 1
        WHEN last_checkin_date IS NULL THEN 1
        ELSE 1
      END,
      last_checkin_date = CURRENT_DATE
    WHERE challenge_id = ${id} AND user_id = ${user.id}
  `)

  return new NextResponse(null, { status: 204 })
}
