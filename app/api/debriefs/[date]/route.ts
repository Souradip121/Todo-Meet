import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { eodDebriefs } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { date } = await params

  const [debrief] = await db
    .select()
    .from(eodDebriefs)
    .where(and(eq(eodDebriefs.userId, user.id), eq(eodDebriefs.date, date)))
    .limit(1)

  if (!debrief) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(debrief)
}
