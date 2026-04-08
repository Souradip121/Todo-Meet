import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { friendships } from "@/lib/db/schema"
import { or, and, eq } from "drizzle-orm"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id: friendId } = await params

  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.userId, user.id), eq(friendships.friendId, friendId)),
        and(eq(friendships.userId, friendId), eq(friendships.friendId, user.id)),
      ),
    )

  return new NextResponse(null, { status: 204 })
}
