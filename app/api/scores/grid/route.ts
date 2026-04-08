import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { dailyScores, commitmentLogs } from "@/lib/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const commitmentId = req.nextUrl.searchParams.get("commitment_id")
  const yearAgo = new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const yearAgoStr = yearAgo.toISOString().split("T")[0]

  if (commitmentId) {
    // Per-commitment grid: aggregate duration_minutes → score 0-5
    const rows = await db.execute(sql`
      SELECT
        date,
        CASE
          WHEN duration_minutes IS NULL OR duration_minutes = 0 THEN 0
          WHEN duration_minutes <= 30 THEN 1
          WHEN duration_minutes <= 60 THEN 2
          WHEN duration_minutes <= 90 THEN 3
          WHEN duration_minutes <= 120 THEN 4
          ELSE 5
        END AS score
      FROM (
        SELECT d::date AS date, SUM(cl.duration_minutes) AS duration_minutes
        FROM generate_series(
          ${yearAgoStr}::date,
          CURRENT_DATE,
          INTERVAL '1 day'
        ) d
        LEFT JOIN commitment_logs cl
          ON cl.commitment_id = ${commitmentId}
          AND cl.date = d::date
        GROUP BY d
      ) sub
      ORDER BY date
    `)
    return NextResponse.json(rows.rows)
  }

  // Global integrity grid
  const rows = await db
    .select({ date: dailyScores.date, score: dailyScores.score })
    .from(dailyScores)
    .where(
      and(
        eq(dailyScores.userId, user.id),
        gte(dailyScores.date, yearAgoStr),
      ),
    )
    .orderBy(dailyScores.date)

  return NextResponse.json(rows)
}
