import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq, and, ne, or, ilike, sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const q        = req.nextUrl.searchParams.get("q") ?? ""
  const college  = req.nextUrl.searchParams.get("college") === "true"

  if (!q && !college) return NextResponse.json([])

  // Base: find users matching query, not self, not already friends
  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.name AS display_name,
      u.image AS avatar_url,
      u.username,
      u.college_url,
      COALESCE(f.status, 'none') AS friendship_status
    FROM users u
    LEFT JOIN friendships f ON
      (f.user_id = ${user.id} AND f.friend_id = u.id)
      OR (f.friend_id = ${user.id} AND f.user_id = u.id)
    WHERE u.id != ${user.id}
      AND (
        ${q !== "" ? sql`(u.name ILIKE ${"%" + q + "%"} OR u.username ILIKE ${"%" + q + "%"})` : sql`TRUE`}
      )
      AND (
        ${college
          ? sql`u.college_url IS NOT NULL AND u.college_url = (SELECT college_url FROM users WHERE id = ${user.id})`
          : sql`TRUE`
        }
      )
    ORDER BY
      CASE WHEN f.status = 'accepted' THEN 0 ELSE 1 END,
      u.name
    LIMIT 20
  `)

  return NextResponse.json(rows.rows)
}
