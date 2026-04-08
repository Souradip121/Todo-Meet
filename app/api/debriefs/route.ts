import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { eodDebriefs } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { what_moved, what_didnt, mood, energy, date } = body

  const today = date ?? new Date().toISOString().split("T")[0]

  const [debrief] = await db
    .insert(eodDebriefs)
    .values({
      userId:    user.id,
      date:      today,
      whatMoved: what_moved ?? null,
      whatDidnt: what_didnt ?? null,
      mood:      mood ?? null,
      energy:    energy ?? null,
    })
    .onConflictDoUpdate({
      target: [eodDebriefs.userId, eodDebriefs.date],
      set: {
        whatMoved:   what_moved ?? null,
        whatDidnt:   what_didnt ?? null,
        mood:        mood ?? null,
        energy:      energy ?? null,
        submittedAt: new Date(),
      },
    })
    .returning()

  return NextResponse.json(debrief, { status: 201 })
}
