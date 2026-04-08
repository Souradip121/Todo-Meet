import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { commitmentLogs, streakFreezeUses, users } from "@/lib/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  // Calculate current streak: consecutive days with at least 1 log
  const rows = await db.execute(sql`
    WITH daily_logged AS (
      SELECT DISTINCT date
      FROM commitment_logs
      WHERE user_id = ${user.id}
      ORDER BY date DESC
    ),
    streaks AS (
      SELECT date,
        ROW_NUMBER() OVER (ORDER BY date DESC) AS rn,
        date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY date DESC) AS grp
      FROM daily_logged
    )
    SELECT
      COUNT(*) AS current_streak,
      MAX(date) AS last_logged_date
    FROM streaks
    WHERE grp = (SELECT grp FROM streaks ORDER BY date DESC LIMIT 1)
  `)

  const streakRow = rows.rows[0] as { current_streak: string; last_logged_date: string } | undefined
  const currentStreak = parseInt(streakRow?.current_streak ?? "0")

  // Longest ever
  const longestRows = await db.execute(sql`
    WITH daily_logged AS (
      SELECT DISTINCT date FROM commitment_logs WHERE user_id = ${user.id}
    ),
    grouped AS (
      SELECT date,
        date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY date) AS grp
      FROM daily_logged
    )
    SELECT MAX(cnt) AS longest_ever
    FROM (SELECT COUNT(*) AS cnt FROM grouped GROUP BY grp) sub
  `)

  const longest = parseInt((longestRows.rows[0] as { longest_ever: string })?.longest_ever ?? "0")

  // Freeze balance
  const [userRow] = await db
    .select({ freezes: users.streakFreezesRemaining })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  return NextResponse.json({
    current:          currentStreak,
    longest_ever:     longest,
    freezes_remaining: userRow?.freezes ?? 0,
  })
}
