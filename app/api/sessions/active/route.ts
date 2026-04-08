import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const rows = await db.execute(sql`
    SELECT
      s.id, s.host_id, s.group_id, s.title, s.duration_min,
      s.status, s.started_at,
      g.title AS group_title,
      (SELECT COUNT(*) FROM session_members WHERE session_id = s.id)::int AS member_count
    FROM focus_sessions s
    JOIN groups g ON g.id = s.group_id
    JOIN group_members gm ON gm.group_id = s.group_id AND gm.user_id = ${user.id}
    WHERE s.status = 'running'
    ORDER BY s.started_at DESC
  `)

  return NextResponse.json(rows.rows)
}
