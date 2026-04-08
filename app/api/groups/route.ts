import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { groups, groupMembers, users } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const rows = await db.execute(sql`
    SELECT
      g.id, g.host_id, g.title, g.description, g.duration_days,
      g.start_date, g.status, g.invite_code, g.type, g.created_at,
      COUNT(gm.user_id)::int AS member_count
    FROM groups g
    JOIN group_members gm_self ON gm_self.group_id = g.id AND gm_self.user_id = ${user.id}
    LEFT JOIN group_members gm ON gm.group_id = g.id
    WHERE g.status = 'active'
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `)

  return NextResponse.json(rows.rows)
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { title, description, duration_days, type } = body

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 422 })

  const [group] = await db
    .insert(groups)
    .values({
      hostId:       user.id,
      title,
      description:  description ?? null,
      durationDays: duration_days ?? 30,
      type:         type ?? "group",
    })
    .returning()

  // Add creator as first member
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId:  user.id,
    role:    "host",
  })

  return NextResponse.json(group, { status: 201 })
}
