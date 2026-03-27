package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/middleware"
	"github.com/Souradip121/showup-api/internal/jobs"
)

type CommitmentHandler struct {
	db *pgxpool.Pool
}

func NewCommitmentHandler(db *pgxpool.Pool) *CommitmentHandler {
	return &CommitmentHandler{db: db}
}

// List returns today's commitments for the authenticated user.
// GET /api/v1/commitments
func (h *CommitmentHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	today := time.Now().Format("2006-01-02")

	rows, err := h.db.Query(r.Context(),
		`SELECT id, declaration_id, title, type, intensity, tag, status, slip_count,
		        honest_score, focus_time_sec, completed_at, created_at
		 FROM commitments
		 WHERE user_id=$1 AND created_at::date=$2
		 ORDER BY created_at`,
		userID, today,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		cm := scanCommitment(rows)
		if cm != nil {
			result = append(result, cm)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Complete marks a commitment as completed.
// PATCH /api/v1/commitments/:id/complete
func (h *CommitmentHandler) Complete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	var body struct {
		HonestScore *int16 `json:"honest_score"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	if body.HonestScore != nil && (*body.HonestScore < 1 || *body.HonestScore > 3) {
		jsonError(w, "honest_score must be 1, 2, or 3", http.StatusUnprocessableEntity)
		return
	}

	// Verify ownership
	if !h.owns(r, userID, id) {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	row := h.db.QueryRow(r.Context(),
		`UPDATE commitments
		 SET status='completed', honest_score=$2, completed_at=now()
		 WHERE id=$1
		 RETURNING id, status, honest_score, completed_at`,
		id, body.HonestScore,
	)
	var cid, status string
	var hs *int16
	var completedAt *time.Time
	if err := row.Scan(&cid, &status, &hs, &completedAt); err != nil {
		slog.Error("complete commitment", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	go jobs.UpsertTodayScore(context.Background(), h.db, userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": cid, "status": status, "honest_score": hs, "completed_at": completedAt,
	})
}

// Carry moves a commitment forward (increments slip_count).
// PATCH /api/v1/commitments/:id/carry
func (h *CommitmentHandler) Carry(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	if !h.owns(r, userID, id) {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	row := h.db.QueryRow(r.Context(),
		`UPDATE commitments SET status='carried', slip_count=slip_count+1
		 WHERE id=$1 RETURNING id, status, slip_count`,
		id,
	)
	var cid, status string
	var slip int16
	if err := row.Scan(&cid, &status, &slip); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": cid, "status": status, "slip_count": slip,
	})
}

// Drop marks a commitment as dropped.
// PATCH /api/v1/commitments/:id/drop
func (h *CommitmentHandler) Drop(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	if !h.owns(r, userID, id) {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	row := h.db.QueryRow(r.Context(),
		`UPDATE commitments SET status='dropped' WHERE id=$1 RETURNING id, status`,
		id,
	)
	var cid, status string
	if err := row.Scan(&cid, &status); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"id": cid, "status": status})
}

// Slipping returns commitments carried 3+ consecutive days.
// GET /api/v1/commitments/slipping
func (h *CommitmentHandler) Slipping(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())

	rows, err := h.db.Query(r.Context(),
		`SELECT id, declaration_id, title, type, intensity, tag, status, slip_count,
		        honest_score, focus_time_sec, completed_at, created_at
		 FROM commitments
		 WHERE user_id=$1 AND slip_count >= 3 AND status='pending'
		 ORDER BY slip_count DESC`,
		userID,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		if cm := scanCommitment(rows); cm != nil {
			result = append(result, cm)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// AddFocusTime appends focus seconds to a commitment.
// PATCH /api/v1/commitments/:id/focus
func (h *CommitmentHandler) AddFocusTime(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	var body struct {
		Seconds int32 `json:"seconds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Seconds <= 0 {
		jsonError(w, "seconds must be a positive integer", http.StatusUnprocessableEntity)
		return
	}

	if !h.owns(r, userID, id) {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	row := h.db.QueryRow(r.Context(),
		`UPDATE commitments SET focus_time_sec=focus_time_sec+$2 WHERE id=$1
		 RETURNING id, focus_time_sec`,
		id, body.Seconds,
	)
	var cid string
	var ft int32
	if err := row.Scan(&cid, &ft); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"id": cid, "focus_time_sec": ft})
}

// owns checks that the commitment belongs to userID.
func (h *CommitmentHandler) owns(r *http.Request, userID, id string) bool {
	var ownerID string
	err := h.db.QueryRow(r.Context(), `SELECT user_id FROM commitments WHERE id=$1`, id).Scan(&ownerID)
	return err == nil && ownerID == userID
}

type pgRows interface {
	Scan(dest ...interface{}) error
}

func scanCommitment(row pgRows) map[string]interface{} {
	var id, declID, title, typ, intensity, status string
	var tag *string
	var slipCount int16
	var honestScore *int16
	var focusTimeSec int32
	var completedAt *time.Time
	var createdAt time.Time
	if err := row.Scan(&id, &declID, &title, &typ, &intensity, &tag, &status, &slipCount,
		&honestScore, &focusTimeSec, &completedAt, &createdAt); err != nil {
		return nil
	}
	return map[string]interface{}{
		"id": id, "declaration_id": declID, "title": title, "type": typ,
		"intensity": intensity, "tag": tag, "status": status, "slip_count": slipCount,
		"honest_score": honestScore, "focus_time_sec": focusTimeSec,
		"completed_at": completedAt, "created_at": createdAt,
	}
}
