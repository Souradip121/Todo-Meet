import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { focusSessions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const sessions = await db
    .select()
    .from(focusSessions)
    .where(eq(focusSessions.groupId, id))
    .orderBy(focusSessions.createdAt)
    .limit(20)

  return NextResponse.json(sessions)
}
