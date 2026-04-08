import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { groups, groupMembers } from "@/lib/db/schema"
import { eq, count } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { invite_code } = await req.json()
  if (!invite_code) return NextResponse.json({ error: "invite_code required" }, { status: 422 })

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, invite_code))
    .limit(1)

  if (!group || group.status !== "active") {
    return NextResponse.json({ error: "Group not found or inactive" }, { status: 404 })
  }

  // Check member count
  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group.id))

  const maxMembers = group.type === "duo" ? 2 : 10
  if (memberCount >= maxMembers) {
    return NextResponse.json({ error: `Group is full (max ${maxMembers})` }, { status: 409 })
  }

  await db
    .insert(groupMembers)
    .values({ groupId: group.id, userId: user.id })
    .onConflictDoNothing()

  return NextResponse.json({ group_id: group.id })
}
