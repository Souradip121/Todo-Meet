import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { groupMembers, groups } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [group] = await db
    .select({ hostId: groups.hostId })
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1)

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (group.hostId === user.id) {
    return NextResponse.json({ error: "Host must archive the group instead of leaving" }, { status: 409 })
  }

  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, user.id)))

  return new NextResponse(null, { status: 204 })
}
