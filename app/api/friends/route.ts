import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const rows = await db.execute(sql`
    SELECT
      u.id, u.name AS display_name, u.image AS avatar_url, u.username, u.college_url,
      f.status, f.created_at,
      CASE WHEN f.user_id = ${user.id} THEN 'sent' ELSE 'received' END AS direction
    FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.user_id = ${user.id} THEN f.friend_id ELSE f.user_id END
    WHERE f.user_id = ${user.id} OR f.friend_id = ${user.id}
    ORDER BY f.status, f.created_at DESC
  `)

  return NextResponse.json(rows.rows)
}
