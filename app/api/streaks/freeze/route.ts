import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { streakFreezeUses, users } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function POST() {
  const { user, error } = await requireAuth()
  if (error) return error

  const [userRow] = await db
    .select({ freezes: users.streakFreezesRemaining })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!userRow || userRow.freezes <= 0) {
    return NextResponse.json({ error: "No streak freezes remaining" }, { status: 409 })
  }

  const today = new Date().toISOString().split("T")[0]

  try {
    await db.insert(streakFreezeUses).values({ userId: user.id, date: today })
    await db
      .update(users)
      .set({ streakFreezesRemaining: sql`streak_freezes_remaining - 1` })
      .where(eq(users.id, user.id))

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Already used a freeze today" }, { status: 409 })
  }
}
