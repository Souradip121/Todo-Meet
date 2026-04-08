import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { focusSessions, sessionMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [session] = await db
    .select({ status: focusSessions.status })
    .from(focusSessions)
    .where(eq(focusSessions.id, id))
    .limit(1)

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (session.status === "ended") {
    return NextResponse.json({ error: "Session has ended" }, { status: 409 })
  }

  await db
    .insert(sessionMembers)
    .values({ sessionId: id, userId: user.id })
    .onConflictDoNothing()

  return new NextResponse(null, { status: 204 })
}
