import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { challenges, challengeParticipants } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const status = req.nextUrl.searchParams.get("status")

  const rows = await db.execute(sql`
    SELECT
      c.*,
      COUNT(DISTINCT cp.user_id)::int AS participant_count,
      COUNT(DISTINCT CASE WHEN cp2.last_checkin_date = CURRENT_DATE THEN cp2.user_id END)::int AS still_going,
      COALESCE(SUM(cp.stake_amount_paise), 0)::int AS total_staked_paise,
      EXISTS(SELECT 1 FROM challenge_participants WHERE challenge_id = c.id AND user_id = ${user.id}) AS joined,
      GREATEST(0, (CURRENT_DATE - c.start_date::date)::int + 1) AS day_number,
      GREATEST(0, (c.end_date::date - CURRENT_DATE)::int) AS days_remaining
    FROM challenges c
    LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
    LEFT JOIN challenge_participants cp2 ON cp2.challenge_id = c.id
    WHERE (${status} IS NULL OR c.status = ${status})
    GROUP BY c.id
    ORDER BY
      CASE WHEN c.status = 'active' THEN 0 ELSE 1 END,
      c.start_date DESC
  `)

  return NextResponse.json(rows.rows)
}
