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

type SessionHandler struct {
	db *pgxpool.Pool
}

func NewSessionHandler(db *pgxpool.Pool) *SessionHandler {
	return &SessionHandler{db: db}
}

// Create makes a new session and adds the host as first member.
// POST /api/v1/sessions
func (h *SessionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	var body struct {
		GroupID     *string `json:"group_id"`
		Title       string  `json:"title"`
		DurationMin int     `json:"duration_min"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		jsonError(w, "title is required", http.StatusUnprocessableEntity)
		return
	}
	if body.DurationMin <= 0 {
		body.DurationMin = 25
	}

	var sessionID string
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO sessions (host_id, group_id, title, duration_min)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id`,
		userID, body.GroupID, body.Title, body.DurationMin,
	).Scan(&sessionID)
	if err != nil {
		slog.Error("create session", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	h.db.Exec(r.Context(),
		`INSERT INTO session_members (session_id, user_id) VALUES ($1, $2)`,
		sessionID, userID,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": sessionID, "title": body.Title,
		"duration_min": body.DurationMin, "status": "waiting",
	})
}

// Get returns the current state of a session.
// GET /api/v1/sessions/:id
func (h *SessionHandler) Get(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")

	var sess struct {
		ID          string     `json:"id"`
		HostID      string     `json:"host_id"`
		GroupID     *string    `json:"group_id"`
		Title       string     `json:"title"`
		DurationMin int        `json:"duration_min"`
		Status      string     `json:"status"`
		StartedAt   *time.Time `json:"started_at"`
		EndedAt     *time.Time `json:"ended_at"`
	}
	if err := h.db.QueryRow(r.Context(),
		`SELECT id, host_id, group_id, title, duration_min, status, started_at, ended_at
		 FROM sessions WHERE id=$1`,
		sessionID,
	).Scan(&sess.ID, &sess.HostID, &sess.GroupID, &sess.Title, &sess.DurationMin,
		&sess.Status, &sess.StartedAt, &sess.EndedAt); err != nil {
		jsonError(w, "session not found", http.StatusNotFound)
		return
	}

	// Members
	mRows, _ := h.db.Query(r.Context(),
		`SELECT u.id, u.display_name, u.avatar_url, sm.joined_at, sm.update_text
		 FROM session_members sm
		 JOIN users u ON u.id=sm.user_id
		 WHERE sm.session_id=$1
		 ORDER BY sm.joined_at`,
		sessionID,
	)
	defer mRows.Close()
	members := []map[string]interface{}{}
	for mRows.Next() {
		var uid, displayName string
		var avatarURL, updateText *string
		var joinedAt time.Time
		if err := mRows.Scan(&uid, &displayName, &avatarURL, &joinedAt, &updateText); err == nil {
			members = append(members, map[string]interface{}{
				"user_id": uid, "display_name": displayName,
				"avatar_url": avatarURL, "joined_at": joinedAt, "update_text": updateText,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"session": sess, "members": members})
}

// Join adds the user to a session.
// POST /api/v1/sessions/:id/join
func (h *SessionHandler) Join(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	sessionID := chi.URLParam(r, "id")

	var status string
	if err := h.db.QueryRow(r.Context(),
		`SELECT status FROM sessions WHERE id=$1`, sessionID,
	).Scan(&status); err != nil {
		jsonError(w, "session not found", http.StatusNotFound)
		return
	}
	if status == "ended" {
		jsonError(w, "session has ended", http.StatusConflict)
		return
	}

	h.db.Exec(r.Context(),
		`INSERT INTO session_members (session_id, user_id) VALUES ($1, $2)
		 ON CONFLICT (session_id, user_id) DO NOTHING`,
		sessionID, userID,
	)
	w.WriteHeader(http.StatusNoContent)
}

// Start transitions session from waiting → running (host only).
// POST /api/v1/sessions/:id/start
func (h *SessionHandler) Start(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	sessionID := chi.URLParam(r, "id")

	res, err := h.db.Exec(r.Context(),
		`UPDATE sessions SET status='running', started_at=now()
		 WHERE id=$1 AND host_id=$2 AND status='waiting'`,
		sessionID, userID,
	)
	if err != nil || res.RowsAffected() == 0 {
		jsonError(w, "not found, not host, or already started", http.StatusConflict)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// End transitions session to ended (host only).
// POST /api/v1/sessions/:id/end
func (h *SessionHandler) End(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	sessionID := chi.URLParam(r, "id")

	res, err := h.db.Exec(r.Context(),
		`UPDATE sessions SET status='ended', ended_at=now()
		 WHERE id=$1 AND host_id=$2 AND status='running'`,
		sessionID, userID,
	)
	if err != nil || res.RowsAffected() == 0 {
		jsonError(w, "not found, not host, or not running", http.StatusConflict)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// SubmitUpdate saves a member's post-session note.
// PATCH /api/v1/sessions/:id/update
func (h *SessionHandler) SubmitUpdate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	sessionID := chi.URLParam(r, "id")

	var body struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	res, err := h.db.Exec(r.Context(),
		`UPDATE session_members SET update_text=$3
		 WHERE session_id=$1 AND user_id=$2`,
		sessionID, userID, body.Text,
	)
	if err != nil || res.RowsAffected() == 0 {
		jsonError(w, "not a member of this session", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Active returns running sessions in groups the authenticated user belongs to.
// GET /api/v1/sessions/active
func (h *SessionHandler) Active(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())

	rows, err := h.db.Query(r.Context(),
		`SELECT s.id, s.host_id, s.group_id, s.title, s.duration_min,
		        s.status, s.started_at,
		        g.title AS group_title,
		        (SELECT COUNT(*) FROM session_members WHERE session_id=s.id) AS member_count
		 FROM sessions s
		 JOIN groups g ON g.id = s.group_id
		 JOIN group_members gm ON gm.group_id = s.group_id AND gm.user_id = $1
		 WHERE s.status = 'running'
		 ORDER BY s.started_at DESC`,
		userID,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		var id, hostID, title, status, groupTitle string
		var groupID *string
		var durationMin, memberCount int
		var startedAt *time.Time
		if err := rows.Scan(&id, &hostID, &groupID, &title, &durationMin,
			&status, &startedAt, &groupTitle, &memberCount); err == nil {
			result = append(result, map[string]interface{}{
				"id": id, "host_id": hostID, "group_id": groupID,
				"title": title, "duration_min": durationMin, "status": status,
				"started_at": startedAt, "group_title": groupTitle, "member_count": memberCount,
			})
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// ListForGroup returns recent sessions for a group.
// GET /api/v1/groups/:id/sessions
func (h *SessionHandler) ListForGroup(w http.ResponseWriter, r *http.Request) {
	groupID := chi.URLParam(r, "id")

	rows, err := h.db.Query(r.Context(),
		`SELECT id, host_id, title, duration_min, status, started_at, ended_at, created_at
		 FROM sessions
		 WHERE group_id=$1
		 ORDER BY created_at DESC
		 LIMIT 20`,
		groupID,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		var id, hostID, title, status string
		var durationMin int
		var startedAt, endedAt *time.Time
		var createdAt time.Time
		if err := rows.Scan(&id, &hostID, &title, &durationMin, &status,
			&startedAt, &endedAt, &createdAt); err == nil {
			result = append(result, map[string]interface{}{
				"id": id, "host_id": hostID, "title": title,
				"duration_min": durationMin, "status": status,
				"started_at": startedAt, "ended_at": endedAt, "created_at": createdAt,
			})
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
