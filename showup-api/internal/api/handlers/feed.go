package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/middleware"
)

type FeedHandler struct {
	db *pgxpool.Pool
}

func NewFeedHandler(db *pgxpool.Pool) *FeedHandler {
	return &FeedHandler{db: db}
}

// List returns the last 50 activity events from accepted friends.
// GET /api/v1/feed
func (h *FeedHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())

	// Union of three event types from friends:
	// 1. commitment_logs (log_time)
	// 2. challenge_checkins (challenge_checkin)
	// 3. eod_debriefs (debrief_submitted)
	rows, err := h.db.Query(r.Context(),
		`SELECT actor_id, display_name, username, avatar_url, event_type, payload, created_at
		 FROM (
		   -- Commitment log events
		   SELECT cl.user_id AS actor_id, u.display_name, u.username, u.avatar_url,
		          'log_time' AS event_type,
		          json_build_object(
		            'commitment_name', rc.name,
		            'commitment_emoji', rc.emoji,
		            'duration_minutes', cl.duration_minutes
		          )::text AS payload,
		          cl.created_at
		   FROM commitment_logs cl
		   JOIN users u ON u.id = cl.user_id
		   JOIN recurring_commitments rc ON rc.id = cl.commitment_id
		   WHERE cl.user_id IN (
		     SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'accepted'
		     UNION
		     SELECT user_id FROM friendships WHERE friend_id = $1 AND status = 'accepted'
		   )
		   AND cl.created_at > now() - interval '7 days'

		   UNION ALL

		   -- Challenge checkin events
		   SELECT cc.user_id AS actor_id, u.display_name, u.username, u.avatar_url,
		          'challenge_checkin' AS event_type,
		          json_build_object(
		            'challenge_title', c.title,
		            'challenge_id', c.id,
		            'streak', cp.current_streak
		          )::text AS payload,
		          cc.created_at
		   FROM challenge_checkins cc
		   JOIN users u ON u.id = cc.user_id
		   JOIN challenges c ON c.id = cc.challenge_id
		   JOIN challenge_participants cp ON cp.challenge_id = cc.challenge_id AND cp.user_id = cc.user_id
		   WHERE cc.user_id IN (
		     SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'accepted'
		     UNION
		     SELECT user_id FROM friendships WHERE friend_id = $1 AND status = 'accepted'
		   )
		   AND cc.created_at > now() - interval '7 days'

		   UNION ALL

		   -- EOD debrief events
		   SELECT d.user_id AS actor_id, u.display_name, u.username, u.avatar_url,
		          'debrief_submitted' AS event_type,
		          json_build_object('mood', d.mood, 'energy', d.energy)::text AS payload,
		          d.submitted_at AS created_at
		   FROM eod_debriefs d
		   JOIN users u ON u.id = d.user_id
		   WHERE d.user_id IN (
		     SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'accepted'
		     UNION
		     SELECT user_id FROM friendships WHERE friend_id = $1 AND status = 'accepted'
		   )
		   AND d.submitted_at > now() - interval '7 days'
		 ) events
		 ORDER BY created_at DESC
		 LIMIT 50`,
		userID,
	)
	if err != nil {
		slog.Error("feed list", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Event struct {
		ActorID     string      `json:"actor_id"`
		DisplayName string      `json:"display_name"`
		Username    string      `json:"username"`
		AvatarURL   *string     `json:"avatar_url"`
		EventType   string      `json:"event_type"`
		Payload     interface{} `json:"payload"`
		CreatedAt   time.Time   `json:"created_at"`
	}

	events := []Event{}
	for rows.Next() {
		var e Event
		var payloadRaw string
		if err := rows.Scan(&e.ActorID, &e.DisplayName, &e.Username, &e.AvatarURL,
			&e.EventType, &payloadRaw, &e.CreatedAt); err != nil {
			continue
		}
		json.Unmarshal([]byte(payloadRaw), &e.Payload)
		events = append(events, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}
