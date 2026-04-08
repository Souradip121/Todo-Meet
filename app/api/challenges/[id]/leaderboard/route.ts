import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { challengeParticipants, users } from "@/lib/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const period = req.nextUrl.searchParams.get("period") ?? "alltime"

  const rows = await db.execute(sql`
    SELECT
      cp.user_id,
      u.name AS display_name,
      u.image AS avatar_url,
      cp.current_streak,
      cp.total_checkins,
      cp.last_checkin_date,
      ROW_NUMBER() OVER (ORDER BY cp.current_streak DESC, cp.total_checkins DESC) AS rank
    FROM challenge_participants cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.challenge_id = ${id}
    ORDER BY rank
    LIMIT 50
  `)

  const myEntry = (rows.rows as Record<string, unknown>[]).find(
    (r) => r.user_id === user.id,
  )

  return NextResponse.json({ entries: rows.rows, my_entry: myEntry ?? null })
}
