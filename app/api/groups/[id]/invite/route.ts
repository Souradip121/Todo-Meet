import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { groups, groupMembers, friendships } from "@/lib/db/schema"
import { eq, and, or, count } from "drizzle-orm"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id: groupId } = await params

  const { user_id: targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: "user_id required" }, { status: 422 })

  // Only host can directly invite
  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.hostId, user.id)))
    .limit(1)
  if (!group) return NextResponse.json({ error: "Not found or not host" }, { status: 404 })

  // Target must be a friend
  const [friendship] = await db
    .select({ id: friendships.userId })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          and(eq(friendships.userId, user.id), eq(friendships.friendId, targetUserId)),
          and(eq(friendships.userId, targetUserId), eq(friendships.friendId, user.id)),
        ),
      ),
    )
    .limit(1)
  if (!friendship) return NextResponse.json({ error: "Target user is not a friend" }, { status: 403 })

  // Check capacity
  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))

  const maxMembers = group.type === "duo" ? 2 : 10
  if (memberCount >= maxMembers) {
    return NextResponse.json({ error: "Group is full" }, { status: 409 })
  }

  await db
    .insert(groupMembers)
    .values({ groupId, userId: targetUserId })
    .onConflictDoNothing()

  return new NextResponse(null, { status: 204 })
}
