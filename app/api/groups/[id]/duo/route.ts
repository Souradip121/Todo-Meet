import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { groupMembers, commitmentLogs, users } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const today = new Date().toISOString().split("T")[0]

  // Members with last 14 days logged status
  const members = await db.execute(sql`
    SELECT
      u.id, u.name AS display_name, u.image AS avatar_url,
      gm.joined_at,
      (
        SELECT COUNT(DISTINCT cl.date)
        FROM commitment_logs cl
        WHERE cl.user_id = u.id
          AND cl.date >= CURRENT_DATE - INTERVAL '14 days'
      )::int AS streak_14,
      EXISTS(
        SELECT 1 FROM commitment_logs cl
        WHERE cl.user_id = u.id AND cl.date = ${today}
      ) AS logged_today
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ${id}
    ORDER BY gm.joined_at
  `)

  // Duo streak: consecutive days both members logged
  const duoStreak = await db.execute(sql`
    WITH member_dates AS (
      SELECT DISTINCT cl.date
      FROM commitment_logs cl
      JOIN group_members gm ON gm.user_id = cl.user_id AND gm.group_id = ${id}
      GROUP BY cl.date
      HAVING COUNT(DISTINCT cl.user_id) = (
        SELECT COUNT(*) FROM group_members WHERE group_id = ${id}
      )
      ORDER BY date DESC
    ),
    streaks AS (
      SELECT date,
        ROW_NUMBER() OVER (ORDER BY date DESC) AS rn,
        date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY date DESC) AS grp
      FROM member_dates
    )
    SELECT COUNT(*)::int AS duo_streak
    FROM streaks
    WHERE grp = (SELECT grp FROM streaks ORDER BY date DESC LIMIT 1)
  `)

  const bothLoggedToday = (members.rows as Record<string, unknown>[]).every(
    (m) => m.logged_today,
  )

  return NextResponse.json({
    members: members.rows,
    duo_streak: (duoStreak.rows[0] as { duo_streak: number })?.duo_streak ?? 0,
    both_logged_today: bothLoggedToday,
  })
}
