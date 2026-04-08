import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { friendships } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id: requesterId } = await params

  const [updated] = await db
    .update(friendships)
    .set({ status: "accepted" })
    .where(
      and(
        eq(friendships.userId, requesterId),
        eq(friendships.friendId, user.id),
        eq(friendships.status, "pending"),
      ),
    )
    .returning()

  if (!updated) return NextResponse.json({ error: "Request not found" }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
