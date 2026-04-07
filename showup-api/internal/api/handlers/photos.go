package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/middleware"
	"github.com/Souradip121/showup-api/internal/storage"
)

type PhotoHandler struct {
	db  *pgxpool.Pool
	cdn *storage.CloudinaryClient
}

func NewPhotoHandler(db *pgxpool.Pool, cdn *storage.CloudinaryClient) *PhotoHandler {
	return &PhotoHandler{db: db, cdn: cdn}
}

func (h *PhotoHandler) userTZ(r *http.Request, userID string) *time.Location {
	var tz string
	h.db.QueryRow(r.Context(), `SELECT timezone FROM users WHERE id=$1`, userID).Scan(&tz)
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return time.UTC
	}
	return loc
}

func (h *PhotoHandler) dateGuard(r *http.Request, userID, date string) bool {
	loc := h.userTZ(r, userID)
	today := time.Now().In(loc).Format("2006-01-02")
	yesterday := time.Now().In(loc).AddDate(0, 0, -1).Format("2006-01-02")
	return date == today || date == yesterday
}

// SignUpload generates Cloudinary signed upload params for a commitment log photo.
// POST /api/v1/commitments/recurring/:id/logs/:date/photo-sign
func (h *PhotoHandler) SignUpload(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	commitmentID := chi.URLParam(r, "id")
	date := chi.URLParam(r, "date")

	if h.cdn == nil {
		jsonError(w, "photo upload not configured", http.StatusServiceUnavailable)
		return
	}

	if !h.dateGuard(r, userID, date) {
		jsonError(w, "can only upload photos for today or yesterday", http.StatusForbidden)
		return
	}

	// Verify commitment ownership
	var exists bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM recurring_commitments WHERE id=$1 AND user_id=$2 AND status='active')`,
		commitmentID, userID,
	).Scan(&exists)
	if !exists {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	// Verify log exists for this date (must log time before adding photo)
	var logExists bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM commitment_logs WHERE commitment_id=$1 AND user_id=$2 AND date=$3)`,
		commitmentID, userID, date,
	).Scan(&logExists)
	if !logExists {
		jsonError(w, "log time first before adding a photo", http.StatusConflict)
		return
	}

	params := h.cdn.SignUpload(userID, commitmentID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(params)
}

// ConfirmPhoto stores the Cloudinary URL returned after a successful direct upload.
// PATCH /api/v1/commitments/recurring/:id/logs/:date/photo
func (h *PhotoHandler) ConfirmPhoto(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	commitmentID := chi.URLParam(r, "id")
	date := chi.URLParam(r, "date")

	if !h.dateGuard(r, userID, date) {
		jsonError(w, "can only update photos for today or yesterday", http.StatusForbidden)
		return
	}

	var body struct {
		PhotoURL string `json:"photo_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.PhotoURL == "" {
		jsonError(w, "photo_url is required", http.StatusUnprocessableEntity)
		return
	}

	res, err := h.db.Exec(r.Context(),
		`UPDATE commitment_logs SET photo_url=$1
		 WHERE commitment_id=$2 AND user_id=$3 AND date=$4`,
		body.PhotoURL, commitmentID, userID, date,
	)
	if err != nil || res.RowsAffected() == 0 {
		jsonError(w, "log not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeletePhoto removes the photo URL from a log entry.
// DELETE /api/v1/commitments/recurring/:id/logs/:date/photo
func (h *PhotoHandler) DeletePhoto(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	commitmentID := chi.URLParam(r, "id")
	date := chi.URLParam(r, "date")

	if !h.dateGuard(r, userID, date) {
		jsonError(w, "can only delete photos for today or yesterday", http.StatusForbidden)
		return
	}

	h.db.Exec(r.Context(),
		`UPDATE commitment_logs SET photo_url=NULL
		 WHERE commitment_id=$1 AND user_id=$2 AND date=$3`,
		commitmentID, userID, date,
	)
	w.WriteHeader(http.StatusNoContent)
}
