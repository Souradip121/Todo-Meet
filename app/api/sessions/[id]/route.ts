import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { focusSessions, sessionMembers, users } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [session] = await db
    .select()
    .from(focusSessions)
    .where(eq(focusSessions.id, id))
    .limit(1)

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const members = await db.execute(sql`
    SELECT
      u.id AS user_id, u.name AS display_name, u.image AS avatar_url,
      sm.joined_at, sm.update_text
    FROM session_members sm
    JOIN users u ON u.id = sm.user_id
    WHERE sm.session_id = ${id}
    ORDER BY sm.joined_at
  `)

  return NextResponse.json({ session, members: members.rows })
}
