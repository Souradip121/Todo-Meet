import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { groups, groupMembers, users, dailyScores } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1)

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const today = new Date().toISOString().split("T")[0]

  // Members with today's score
  const members = await db.execute(sql`
    SELECT
      u.id, u.name AS display_name, u.image AS avatar_url, u.username,
      gm.role, gm.joined_at,
      COALESCE(ds.score, 0) AS today_score
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    LEFT JOIN daily_scores ds ON ds.user_id = gm.user_id AND ds.date = ${today}
    WHERE gm.group_id = ${id}
    ORDER BY gm.joined_at
  `)

  return NextResponse.json({ ...group, members: members.rows })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [updated] = await db
    .update(groups)
    .set({ status: "archived" })
    .where(and(eq(groups.id, id), eq(groups.hostId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found or not host" }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
