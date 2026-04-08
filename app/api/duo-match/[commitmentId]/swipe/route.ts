import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { duoMatchSwipes, groups, groupMembers } from "@/lib/db/schema"
import { sql } from "drizzle-orm"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commitmentId: string }> }
) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { commitmentId } = await params
  const body = await req.json()
  const { swipedId, direction } = body as { swipedId: string; direction: "left" | "right" }

  if (!swipedId || !direction) {
    return NextResponse.json({ error: "swipedId and direction are required" }, { status: 422 })
  }
  if (direction !== "left" && direction !== "right") {
    return NextResponse.json({ error: "direction must be 'left' or 'right'" }, { status: 422 })
  }

  // Record the swipe
  await db
    .insert(duoMatchSwipes)
    .values({
      swiperId:     user.id,
      swipedId,
      commitmentId,
      direction,
    })
    .onConflictDoNothing()

  // If it's a left swipe, we're done
  if (direction === "left") {
    return NextResponse.json({ matched: false })
  }

  // Check for mutual right swipe
  const mutualRows = await db.execute(sql`
    SELECT 1 FROM duo_match_swipes
    WHERE swiper_id = ${swipedId}
      AND swiped_id = ${user.id}
      AND commitment_id = ${commitmentId}
      AND direction = 'right'
    LIMIT 1
  `)

  if (mutualRows.rows.length === 0) {
    return NextResponse.json({ matched: false })
  }

  // Mutual match — auto-create a duo group
  // Get commitment names for the title
  const commitmentRows = await db.execute(sql`
    SELECT name FROM recurring_commitments WHERE id = ${commitmentId} LIMIT 1
  `)
  const commitmentName = (commitmentRows.rows[0] as { name: string })?.name ?? "Duo"

  const matchedUserRows = await db.execute(sql`
    SELECT name FROM users WHERE id = ${swipedId} LIMIT 1
  `)
  const matchedName = (matchedUserRows.rows[0] as { name: string })?.name ?? "Partner"
  const currentName = user.name ?? "You"

  const title = `${commitmentName}: ${currentName.split(" ")[0]} & ${matchedName.split(" ")[0]}`

  const [group] = await db
    .insert(groups)
    .values({
      hostId:       user.id,
      title,
      durationDays: 30,
      type:         "duo",
    })
    .returning()

  // Add both users as members
  await db.insert(groupMembers).values([
    { groupId: group.id, userId: user.id,    role: "host"   },
    { groupId: group.id, userId: swipedId,   role: "member" },
  ])

  return NextResponse.json({ matched: true, groupId: group.id, groupTitle: title })
}
