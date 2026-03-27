package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/middleware"
)

type GroupHandler struct {
	db *pgxpool.Pool
}

func NewGroupHandler(db *pgxpool.Pool) *GroupHandler {
	return &GroupHandler{db: db}
}

// Create makes a new group and adds the creator as host member.
// POST /api/v1/groups
func (h *GroupHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	var body struct {
		Title        string `json:"title"`
		Description  string `json:"description"`
		DurationDays int    `json:"duration_days"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		jsonError(w, "title is required", http.StatusUnprocessableEntity)
		return
	}
	if len(body.Title) > 100 {
		jsonError(w, "title max 100 characters", http.StatusUnprocessableEntity)
		return
	}
	if body.DurationDays <= 0 {
		body.DurationDays = 30
	}

	var groupID, inviteCode string
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO groups (host_id, title, description, duration_days)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, invite_code`,
		userID, body.Title, body.Description, body.DurationDays,
	).Scan(&groupID, &inviteCode)
	if err != nil {
		slog.Error("create group", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Add creator as host member
	h.db.Exec(r.Context(),
		`INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'host')`,
		groupID, userID,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": groupID, "invite_code": inviteCode,
		"title": body.Title, "description": body.Description,
		"duration_days": body.DurationDays,
	})
}

// List returns all groups the user belongs to.
// GET /api/v1/groups
func (h *GroupHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())

	rows, err := h.db.Query(r.Context(),
		`SELECT g.id, g.title, g.description, g.duration_days, g.start_date,
		        g.status, g.invite_code, g.host_id, gm.role,
		        (SELECT COUNT(*) FROM group_members WHERE group_id=g.id) AS member_count
		 FROM groups g
		 JOIN group_members gm ON gm.group_id=g.id AND gm.user_id=$1
		 WHERE g.status='active'
		 ORDER BY g.created_at DESC`,
		userID,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		var id, title, desc, status, inviteCode, hostID, role string
		var durationDays, memberCount int
		var startDate time.Time
		if err := rows.Scan(&id, &title, &desc, &durationDays, &startDate,
			&status, &inviteCode, &hostID, &role, &memberCount); err == nil {
			result = append(result, map[string]interface{}{
				"id": id, "title": title, "description": desc,
				"duration_days": durationDays, "start_date": startDate.Format("2006-01-02"),
				"status": status, "invite_code": inviteCode,
				"host_id": hostID, "role": role, "member_count": memberCount,
			})
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Get returns a single group with member list and today's scores.
// GET /api/v1/groups/:id
func (h *GroupHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	groupID := chi.URLParam(r, "id")

	// Verify membership
	var role string
	if err := h.db.QueryRow(r.Context(),
		`SELECT role FROM group_members WHERE group_id=$1 AND user_id=$2`,
		groupID, userID,
	).Scan(&role); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	// Group details
	var g struct {
		ID           string    `json:"id"`
		Title        string    `json:"title"`
		Description  string    `json:"description"`
		DurationDays int       `json:"duration_days"`
		StartDate    string    `json:"start_date"`
		Status       string    `json:"status"`
		InviteCode   string    `json:"invite_code"`
		HostID       string    `json:"host_id"`
	}
	var startDate time.Time
	if err := h.db.QueryRow(r.Context(),
		`SELECT id, title, description, duration_days, start_date, status, invite_code, host_id
		 FROM groups WHERE id=$1`,
		groupID,
	).Scan(&g.ID, &g.Title, &g.Description, &g.DurationDays, &startDate,
		&g.Status, &g.InviteCode, &g.HostID); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	g.StartDate = startDate.Format("2006-01-02")

	// Members with today's score
	today := time.Now().Format("2006-01-02")
	mRows, _ := h.db.Query(r.Context(),
		`SELECT u.id, u.display_name, u.avatar_url, gm.role, gm.joined_at,
		        COALESCE(ds.score, 0) AS today_score
		 FROM group_members gm
		 JOIN users u ON u.id=gm.user_id
		 LEFT JOIN daily_scores ds ON ds.user_id=gm.user_id AND ds.date=$2
		 WHERE gm.group_id=$1
		 ORDER BY gm.joined_at`,
		groupID, today,
	)
	defer mRows.Close()

	members := []map[string]interface{}{}
	for mRows.Next() {
		var uid, displayName, memberRole string
		var avatarURL *string
		var joinedAt time.Time
		var todayScore int
		if err := mRows.Scan(&uid, &displayName, &avatarURL, &memberRole,
			&joinedAt, &todayScore); err == nil {
			members = append(members, map[string]interface{}{
				"user_id": uid, "display_name": displayName, "avatar_url": avatarURL,
				"role": memberRole, "joined_at": joinedAt, "today_score": todayScore,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"group":   g,
		"members": members,
		"my_role": role,
	})
}

// Join adds the authenticated user to a group via invite code.
// POST /api/v1/groups/join
func (h *GroupHandler) Join(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	var body struct {
		InviteCode string `json:"invite_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.InviteCode == "" {
		jsonError(w, "invite_code is required", http.StatusUnprocessableEntity)
		return
	}

	var groupID string
	if err := h.db.QueryRow(r.Context(),
		`SELECT id FROM groups WHERE invite_code=$1 AND status='active'`,
		body.InviteCode,
	).Scan(&groupID); err != nil {
		jsonError(w, "invalid or expired invite code", http.StatusNotFound)
		return
	}

	// Check max members (10)
	var count int
	h.db.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM group_members WHERE group_id=$1`, groupID,
	).Scan(&count)
	if count >= 10 {
		jsonError(w, "group is full (max 10 members)", http.StatusConflict)
		return
	}

	_, err := h.db.Exec(r.Context(),
		`INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
		 ON CONFLICT (group_id, user_id) DO NOTHING`,
		groupID, userID,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"group_id": groupID})
}

// Leave removes the user from a group. Host must transfer or archive first.
// POST /api/v1/groups/:id/leave
func (h *GroupHandler) Leave(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	groupID := chi.URLParam(r, "id")

	// Hosts can't leave — they must archive
	var role string
	if err := h.db.QueryRow(r.Context(),
		`SELECT role FROM group_members WHERE group_id=$1 AND user_id=$2`,
		groupID, userID,
	).Scan(&role); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	if role == "host" {
		jsonError(w, "hosts must archive the group instead of leaving", http.StatusUnprocessableEntity)
		return
	}

	h.db.Exec(r.Context(),
		`DELETE FROM group_members WHERE group_id=$1 AND user_id=$2`,
		groupID, userID,
	)
	w.WriteHeader(http.StatusNoContent)
}

// Nudge sends a nudge to a member. Rate limited: 1 per sender per target per 6h.
// POST /api/v1/groups/:id/nudge/:userID
func (h *GroupHandler) Nudge(w http.ResponseWriter, r *http.Request) {
	senderID := middleware.UserIDFrom(r.Context())
	groupID := chi.URLParam(r, "id")
	targetID := chi.URLParam(r, "userID")

	// Verify sender is in group
	var exists bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2)`,
		groupID, senderID,
	).Scan(&exists)
	if !exists {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	// Rate limit: 1 nudge per sender→target per 6 hours
	var recentCount int
	h.db.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM nudges
		 WHERE group_id=$1 AND from_user=$2 AND to_user=$3
		   AND sent_at > now() - interval '6 hours'`,
		groupID, senderID, targetID,
	).Scan(&recentCount)
	if recentCount > 0 {
		jsonError(w, "you already nudged this person recently", http.StatusTooManyRequests)
		return
	}

	h.db.Exec(r.Context(),
		`INSERT INTO nudges (group_id, from_user, to_user) VALUES ($1, $2, $3)`,
		groupID, senderID, targetID,
	)
	w.WriteHeader(http.StatusNoContent)
}

// Archive sets a group status to archived (host only).
// DELETE /api/v1/groups/:id
func (h *GroupHandler) Archive(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	groupID := chi.URLParam(r, "id")

	res, err := h.db.Exec(r.Context(),
		`UPDATE groups SET status='archived' WHERE id=$1 AND host_id=$2`,
		groupID, userID,
	)
	if err != nil || res.RowsAffected() == 0 {
		jsonError(w, "not found or not host", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
