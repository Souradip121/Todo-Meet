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

type FriendsHandler struct {
	db *pgxpool.Pool
}

func NewFriendsHandler(db *pgxpool.Pool) *FriendsHandler {
	return &FriendsHandler{db: db}
}

type friendUser struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"display_name"`
	Username    string    `json:"username"`
	AvatarURL   *string   `json:"avatar_url"`
	CollegeURL  *string   `json:"college_url"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

// List returns accepted friends and pending requests.
// GET /api/v1/friends
func (h *FriendsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())

	rows, err := h.db.Query(r.Context(),
		`SELECT u.id, u.display_name, u.username, u.avatar_url, u.college_url,
		        f.status, f.created_at
		 FROM friendships f
		 JOIN users u ON (
		   CASE WHEN f.user_id = $1 THEN u.id = f.friend_id
		        ELSE u.id = f.user_id
		   END
		 )
		 WHERE $1 IN (f.user_id, f.friend_id)
		 ORDER BY f.created_at DESC`,
		userID,
	)
	if err != nil {
		slog.Error("friends list", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []friendUser{}
	for rows.Next() {
		var u friendUser
		if err := rows.Scan(&u.ID, &u.DisplayName, &u.Username, &u.AvatarURL,
			&u.CollegeURL, &u.Status, &u.CreatedAt); err != nil {
			continue
		}
		result = append(result, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Search finds users by username or display_name (not self, not already friends).
// GET /api/v1/friends/search?q=...
func (h *FriendsHandler) Search(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	q := "%" + r.URL.Query().Get("q") + "%"
	if q == "%%" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT u.id, u.display_name, u.username, u.avatar_url, u.college_url,
		        COALESCE(f.status, 'none') AS friendship_status
		 FROM users u
		 LEFT JOIN friendships f ON (
		   (f.user_id = $1 AND f.friend_id = u.id) OR
		   (f.friend_id = $1 AND f.user_id = u.id)
		 )
		 WHERE u.id != $1
		   AND (u.username ILIKE $2 OR u.display_name ILIKE $2)
		 LIMIT 20`,
		userID, q,
	)
	if err != nil {
		slog.Error("friends search", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type result struct {
		ID               string  `json:"id"`
		DisplayName      string  `json:"display_name"`
		Username         string  `json:"username"`
		AvatarURL        *string `json:"avatar_url"`
		CollegeURL       *string `json:"college_url"`
		FriendshipStatus string  `json:"friendship_status"`
	}
	users := []result{}
	for rows.Next() {
		var u result
		if err := rows.Scan(&u.ID, &u.DisplayName, &u.Username, &u.AvatarURL,
			&u.CollegeURL, &u.FriendshipStatus); err != nil {
			continue
		}
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// SendRequest creates a pending friendship request to another user.
// POST /api/v1/friends/{id}/request
func (h *FriendsHandler) SendRequest(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	targetID := chi.URLParam(r, "id")

	if userID == targetID {
		jsonError(w, "cannot friend yourself", http.StatusUnprocessableEntity)
		return
	}

	_, err := h.db.Exec(r.Context(),
		`INSERT INTO friendships (user_id, friend_id, status)
		 VALUES ($1, $2, 'pending')
		 ON CONFLICT DO NOTHING`,
		userID, targetID,
	)
	if err != nil {
		slog.Error("send friend request", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Accept accepts a pending friend request directed at the caller.
// POST /api/v1/friends/{id}/accept
func (h *FriendsHandler) Accept(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	requesterID := chi.URLParam(r, "id")

	result, err := h.db.Exec(r.Context(),
		`UPDATE friendships SET status = 'accepted'
		 WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
		requesterID, userID,
	)
	if err != nil || result.RowsAffected() == 0 {
		jsonError(w, "friend request not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Remove deletes a friendship in either direction.
// DELETE /api/v1/friends/{id}
func (h *FriendsHandler) Remove(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	otherID := chi.URLParam(r, "id")

	h.db.Exec(r.Context(),
		`DELETE FROM friendships
		 WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)`,
		userID, otherID,
	)
	w.WriteHeader(http.StatusNoContent)
}
