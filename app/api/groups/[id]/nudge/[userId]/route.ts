import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { nudges, groupMembers } from "@/lib/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id: groupId, userId: toUser } = await params

  // Rate limit: 1 per sender per target per 6h
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const [recent] = await db
    .select({ id: nudges.id })
    .from(nudges)
    .where(
      and(
        eq(nudges.groupId, groupId),
        eq(nudges.fromUser, user.id),
        eq(nudges.toUser, toUser),
        gte(nudges.sentAt, sixHoursAgo),
      ),
    )
    .limit(1)

  if (recent) {
    return NextResponse.json({ error: "Already nudged this person recently" }, { status: 429 })
  }

  await db.insert(nudges).values({ groupId, fromUser: user.id, toUser })
  return new NextResponse(null, { status: 204 })
}
