import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { duoMatchProfiles } from "@/lib/db/schema"
import { sql } from "drizzle-orm"
import { and, eq } from "drizzle-orm"

// GET /api/duo-match?commitmentId=X
// Returns the next unswipped candidate for duo matching
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const commitmentId = req.nextUrl.searchParams.get("commitmentId")
  if (!commitmentId) {
    return NextResponse.json({ error: "commitmentId is required" }, { status: 422 })
  }

  // Verify the commitment belongs to the user and is active
  const commitmentRows = await db.execute(sql`
    SELECT id, name, emoji, color, target_min_day
    FROM recurring_commitments
    WHERE id = ${commitmentId} AND user_id = ${user.id} AND status = 'active'
    LIMIT 1
  `)
  if (commitmentRows.rows.length === 0) {
    return NextResponse.json({ error: "Commitment not found" }, { status: 404 })
  }

  // Check the user has entered match mode for this commitment
  const profileRows = await db.execute(sql`
    SELECT 1 FROM duo_match_profiles
    WHERE commitment_id = ${commitmentId} AND user_id = ${user.id} AND is_active = true
    LIMIT 1
  `)
  if (profileRows.rows.length === 0) {
    return NextResponse.json({ error: "Not in match mode", code: "NOT_IN_MATCH_MODE" }, { status: 403 })
  }

  // Find the next candidate:
  // - also in match mode for a commitment with the same name
  // - not already swiped by current user
  // - not already in a duo with current user
  // - not the current user
  const candidates = await db.execute(sql`
    SELECT
      u.id,
      u.name AS display_name,
      u.image AS avatar_url,
      u.college_url,
      u.current_focus,
      rc.id AS commitment_id,
      rc.name AS commitment_name,
      rc.emoji AS commitment_emoji,
      rc.target_min_day,
      (
        SELECT COUNT(*)::int
        FROM commitment_logs cl
        WHERE cl.user_id = u.id AND cl.commitment_id = rc.id
      ) AS days_logged,
      (
        SELECT COUNT(*)::int
        FROM commitment_logs cl
        WHERE cl.user_id = u.id AND cl.date >= CURRENT_DATE - 7
      ) AS logs_last_7_days
    FROM duo_match_profiles dmp
    JOIN users u ON u.id = dmp.user_id
    JOIN recurring_commitments rc ON rc.id = dmp.commitment_id
    WHERE dmp.is_active = true
      AND dmp.user_id != ${user.id}
      -- Match by same commitment name (case-insensitive)
      AND LOWER(rc.name) = (
        SELECT LOWER(name) FROM recurring_commitments WHERE id = ${commitmentId}
      )
      -- Not already swiped
      AND NOT EXISTS (
        SELECT 1 FROM duo_match_swipes
        WHERE swiper_id = ${user.id} AND swiped_id = u.id AND commitment_id = ${commitmentId}
      )
      -- Not already in a duo together
      AND NOT EXISTS (
        SELECT 1 FROM group_members gm1
        JOIN group_members gm2 ON gm2.group_id = gm1.group_id
        JOIN groups g ON g.id = gm1.group_id
        WHERE gm1.user_id = ${user.id}
          AND gm2.user_id = u.id
          AND g.type = 'duo'
          AND g.status = 'active'
      )
    ORDER BY dmp.created_at ASC
    LIMIT 1
  `)

  if (candidates.rows.length === 0) {
    return NextResponse.json({ candidate: null, done: true })
  }

  return NextResponse.json({ candidate: candidates.rows[0], done: false })
}

// POST /api/duo-match
// Enter match mode for a commitment
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { commitmentId } = body

  if (!commitmentId) {
    return NextResponse.json({ error: "commitmentId is required" }, { status: 422 })
  }

  // Verify ownership
  const commitmentRows = await db.execute(sql`
    SELECT 1 FROM recurring_commitments
    WHERE id = ${commitmentId} AND user_id = ${user.id} AND status = 'active'
  `)
  if (commitmentRows.rows.length === 0) {
    return NextResponse.json({ error: "Commitment not found" }, { status: 404 })
  }

  await db
    .insert(duoMatchProfiles)
    .values({ commitmentId, userId: user.id, isActive: true })
    .onConflictDoUpdate({
      target: [duoMatchProfiles.commitmentId, duoMatchProfiles.userId],
      set: { isActive: true },
    })

  return NextResponse.json({ ok: true })
}
