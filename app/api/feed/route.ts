import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const rows = await db.execute(sql`
    SELECT
      e.actor_id, e.display_name, e.username, e.avatar_url,
      e.event_type, e.payload, e.created_at, e.event_date,
      COALESCE(r.inspired_count, 0)::int AS inspired_count,
      COALESCE(r.i_inspired, false)      AS i_inspired
    FROM (
      -- Friends' commitment logs
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
          'photo_url', cl.photo_url,
          'date', cl.date
        ) AS payload,
        cl.created_at,
        cl.date::text AS event_date
      FROM commitment_logs cl
      JOIN users u ON u.id = cl.user_id
      JOIN recurring_commitments rc ON rc.id = cl.commitment_id
      JOIN friendships f ON
        (f.user_id = ${user.id} AND f.friend_id = cl.user_id AND f.status = 'accepted')
        OR (f.friend_id = ${user.id} AND f.user_id = cl.user_id AND f.status = 'accepted')
      WHERE cl.created_at >= NOW() - INTERVAL '7 days'

      UNION ALL

      -- Own commitment logs
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
          'photo_url', cl.photo_url,
          'date', cl.date
        ) AS payload,
        cl.created_at,
        cl.date::text AS event_date
      FROM commitment_logs cl
      JOIN users u ON u.id = cl.user_id
      JOIN recurring_commitments rc ON rc.id = cl.commitment_id
      WHERE cl.user_id = ${user.id}
        AND cl.created_at >= NOW() - INTERVAL '7 days'

      UNION ALL

      -- Friends' challenge checkins
      SELECT
        cc.user_id AS actor_id,
        u.name AS display_name,
        u.username,
        u.image AS avatar_url,
        'challenge_checkin' AS event_type,
        jsonb_build_object('challenge_title', c.title, 'date', cc.date) AS payload,
        cc.created_at,
        cc.date::text AS event_date
      FROM challenge_checkins cc
      JOIN users u ON u.id = cc.user_id
      JOIN challenges c ON c.id = cc.challenge_id
      JOIN friendships f ON
        (f.user_id = ${user.id} AND f.friend_id = cc.user_id AND f.status = 'accepted')
        OR (f.friend_id = ${user.id} AND f.user_id = cc.user_id AND f.status = 'accepted')
      WHERE cc.created_at >= NOW() - INTERVAL '7 days'

      UNION ALL

      -- Friends' EOD debriefs
      SELECT
        ed.user_id AS actor_id,
        u.name AS display_name,
        u.username,
        u.image AS avatar_url,
        'debrief_submitted' AS event_type,
        jsonb_build_object('mood', ed.mood, 'date', ed.date) AS payload,
        ed.submitted_at AS created_at,
        ed.date::text AS event_date
      FROM eod_debriefs ed
      JOIN users u ON u.id = ed.user_id
      JOIN friendships f ON
        (f.user_id = ${user.id} AND f.friend_id = ed.user_id AND f.status = 'accepted')
        OR (f.friend_id = ${user.id} AND f.user_id = ed.user_id AND f.status = 'accepted')
      WHERE ed.submitted_at >= NOW() - INTERVAL '7 days'
    ) e
    LEFT JOIN (
      SELECT actor_id, event_type, event_date,
             COUNT(*)::int                                AS inspired_count,
             BOOL_OR(reactor_id = ${user.id})            AS i_inspired
      FROM feed_reactions
      GROUP BY actor_id, event_type, event_date
    ) r ON r.actor_id        = e.actor_id
       AND r.event_type      = e.event_type
       AND r.event_date::text = e.event_date
    ORDER BY e.created_at DESC
    LIMIT 50
  `)

  return NextResponse.json(rows.rows)
}
