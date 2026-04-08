import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { challengeParticipants } from "@/lib/db/schema"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const stakeAmountPaise = body.stake_amount_paise ?? 0

  await db
    .insert(challengeParticipants)
    .values({ challengeId: id, userId: user.id, stakeAmountPaise })
    .onConflictDoNothing()

  return new NextResponse(null, { status: 204 })
}
