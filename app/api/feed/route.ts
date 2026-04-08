import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const rows = await db.execute(sql`
    SELECT
      actor_id, display_name, username, avatar_url,
      event_type, payload, created_at
    FROM (
      -- Commitment logs
      SELECT
        cl.user_id AS actor_id,
        u.name AS display_name,
        u.username,
        u.image AS avatar_url,
        'log_time' AS event_type,
        jsonb_build_object(
          'commitment_name', rc.name,
          'commitment_emoji', rc.emoji,
          'duration_minutes', cl.duration_minutes,
          'date', cl.date
        ) AS payload,
        cl.created_at
      FROM commitment_logs cl
      JOIN users u ON u.id = cl.user_id
      JOIN recurring_commitments rc ON rc.id = cl.commitment_id
      JOIN friendships f ON
        (f.user_id = ${user.id} AND f.friend_id = cl.user_id AND f.status = 'accepted')
        OR (f.friend_id = ${user.id} AND f.user_id = cl.user_id AND f.status = 'accepted')
      WHERE cl.created_at >= NOW() - INTERVAL '7 days'

      UNION ALL

      -- Challenge checkins
      SELECT
        cc.user_id AS actor_id,
        u.name AS display_name,
        u.username,
        u.image AS avatar_url,
        'challenge_checkin' AS event_type,
        jsonb_build_object('challenge_title', c.title, 'date', cc.date) AS payload,
        cc.created_at
      FROM challenge_checkins cc
      JOIN users u ON u.id = cc.user_id
      JOIN challenges c ON c.id = cc.challenge_id
      JOIN friendships f ON
        (f.user_id = ${user.id} AND f.friend_id = cc.user_id AND f.status = 'accepted')
        OR (f.friend_id = ${user.id} AND f.user_id = cc.user_id AND f.status = 'accepted')
      WHERE cc.created_at >= NOW() - INTERVAL '7 days'

      UNION ALL

      -- EOD debriefs
      SELECT
        ed.user_id AS actor_id,
        u.name AS display_name,
        u.username,
        u.image AS avatar_url,
        'debrief_submitted' AS event_type,
        jsonb_build_object('mood', ed.mood, 'date', ed.date) AS payload,
        ed.submitted_at AS created_at
      FROM eod_debriefs ed
      JOIN users u ON u.id = ed.user_id
      JOIN friendships f ON
        (f.user_id = ${user.id} AND f.friend_id = ed.user_id AND f.status = 'accepted')
        OR (f.friend_id = ${user.id} AND f.user_id = ed.user_id AND f.status = 'accepted')
      WHERE ed.submitted_at >= NOW() - INTERVAL '7 days'
    ) events
    ORDER BY created_at DESC
    LIMIT 50
  `)

  return NextResponse.json(rows.rows)
}
