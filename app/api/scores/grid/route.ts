import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { dailyScores } from "@/lib/db/schema"
import { eq, and, gte, lt, sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const commitmentId = req.nextUrl.searchParams.get("commitment_id")
  // Use the date from the client's local timezone if provided, otherwise fall back to UTC
  const clientDate = req.nextUrl.searchParams.get("today")
  const yearAgo = clientDate ? new Date(clientDate) : new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const yearAgoStr = clientDate
    ? `${yearAgo.getFullYear()}-${String(yearAgo.getMonth() + 1).padStart(2, "0")}-${String(yearAgo.getDate()).padStart(2, "0")}`
    : yearAgo.toISOString().split("T")[0]

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

  // Global integrity grid: historical from daily_scores + live today
  const clientTodayStr = clientDate ?? new Date().toISOString().split("T")[0]

  const rows = await db
    .select({ date: dailyScores.date, score: dailyScores.score, breakdown: dailyScores.breakdown })
    .from(dailyScores)
    .where(
      and(
        eq(dailyScores.userId, user.id),
        gte(dailyScores.date, yearAgoStr),
        lt(dailyScores.date, clientTodayStr), // exclude today — computed live below
      ),
    )
    .orderBy(dailyScores.date)

  // Compute today's score live so it reflects logs made since midnight
  const todayResult = await db.execute(sql`
    SELECT
      LEAST(5, GREATEST(0,
        CASE WHEN active_counts.total_active = 0 THEN 0
             ELSE ROUND(log_counts.logged_today::float / active_counts.total_active * 5)::int
        END
      )) AS score
    FROM (
      SELECT COUNT(*)::int AS total_active
      FROM recurring_commitments rc
      WHERE rc.user_id = ${user.id}
        AND rc.status = 'active'
        AND rc.start_date <= ${clientTodayStr}::date
        AND rc.end_date   >= ${clientTodayStr}::date
    ) active_counts
    CROSS JOIN (
      SELECT COUNT(DISTINCT cl.commitment_id)::int AS logged_today
      FROM commitment_logs cl
      JOIN recurring_commitments rc ON rc.id = cl.commitment_id
      WHERE cl.user_id = ${user.id}
        AND cl.date    = ${clientTodayStr}::date
        AND rc.status  = 'active'
    ) log_counts
  `)

  const todayScore = (todayResult.rows[0] as { score: number } | undefined)?.score ?? 0
  const result = [
    ...rows,
    { date: clientTodayStr, score: todayScore, breakdown: {} },
  ]

  return NextResponse.json(result)
}
