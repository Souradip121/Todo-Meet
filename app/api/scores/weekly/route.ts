import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { dailyScores } from "@/lib/db/schema"
import { eq, and, gte } from "drizzle-orm"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)

  const rows = await db
    .select({ date: dailyScores.date, score: dailyScores.score })
    .from(dailyScores)
    .where(
      and(
        eq(dailyScores.userId, user.id),
        gte(dailyScores.date, weekAgo.toISOString().split("T")[0]),
      ),
    )
    .orderBy(dailyScores.date)

  return NextResponse.json(rows)
}
