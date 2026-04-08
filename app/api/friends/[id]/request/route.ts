import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { friendships } from "@/lib/db/schema"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id: friendId } = await params

  if (user.id === friendId) {
    return NextResponse.json({ error: "Cannot friend yourself" }, { status: 422 })
  }

  await db
    .insert(friendships)
    .values({ userId: user.id, friendId })
    .onConflictDoNothing()

  return new NextResponse(null, { status: 204 })
}
