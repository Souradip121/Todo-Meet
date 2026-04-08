import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { recurringCommitments } from "@/lib/db/schema"
import { eq, ne, and, sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const includeArchived = req.nextUrl.searchParams.get("archived") === "true"

  const list = await db
    .select()
    .from(recurringCommitments)
    .where(
      includeArchived
        ? eq(recurringCommitments.userId, user.id)
        : and(
            eq(recurringCommitments.userId, user.id),
            ne(recurringCommitments.status, "archived"),
          ),
    )
    .orderBy(recurringCommitments.createdAt)

  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { name, emoji, color, description, target_min_day, period_days } = body

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 422 })
  }

  const periodDays = period_days ?? 30
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + periodDays)
  const endDateStr = endDate.toISOString().split("T")[0]

  const [commitment] = await db
    .insert(recurringCommitments)
    .values({
      userId:       user.id,
      name,
      emoji:        emoji ?? "⚡",
      color:        color ?? "green",
      description:  description ?? null,
      targetMinDay: target_min_day ?? null,
      periodDays,
      endDate:      endDateStr,
    })
    .returning()

  return NextResponse.json(commitment, { status: 201 })
}
