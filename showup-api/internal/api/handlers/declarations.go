package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/middleware"
)

type DeclarationHandler struct {
	db *pgxpool.Pool
}

func NewDeclarationHandler(db *pgxpool.Pool) *DeclarationHandler {
	return &DeclarationHandler{db: db}
}

type createDeclarationRequest struct {
	Commitments []struct {
		Title     string  `json:"title"`
		Type      string  `json:"type"`
		Intensity string  `json:"intensity"`
		Tag       *string `json:"tag"`
	} `json:"commitments"`
}

// Create submits a morning declaration.
// POST /api/v1/declarations
func (h *DeclarationHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	var req createDeclarationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if len(req.Commitments) == 0 {
		jsonError(w, "at least 1 commitment required", http.StatusUnprocessableEntity)
		return
	}
	if len(req.Commitments) > 3 {
		jsonError(w, "maximum 3 commitments per declaration", http.StatusUnprocessableEntity)
		return
	}
	for _, c := range req.Commitments {
		if len(c.Title) > 200 {
			jsonError(w, "commitment title max 200 characters", http.StatusUnprocessableEntity)
			return
		}
		if !validIntensity(c.Intensity) {
			jsonError(w, "intensity must be soft, firm, or non_negotiable", http.StatusUnprocessableEntity)
			return
		}
		if c.Type == "" {
			c.Type = "personal"
		}
		if c.Tag != nil && !validTag(*c.Tag) {
			jsonError(w, "tag must be work, learning, health, relationships, or other", http.StatusUnprocessableEntity)
			return
		}
	}

	today := time.Now().Format("2006-01-02")

	// Insert declaration
	row := h.db.QueryRow(r.Context(),
		`INSERT INTO declarations (user_id, date) VALUES ($1, $2) RETURNING id, user_id, date, submitted_at`,
		userID, today,
	)
	var decl struct {
		ID          string    `json:"id"`
		UserID      string    `json:"user_id"`
		Date        string    `json:"date"`
		SubmittedAt time.Time `json:"submitted_at"`
	}
	var declDateRaw time.Time
	if err := row.Scan(&decl.ID, &decl.UserID, &declDateRaw, &decl.SubmittedAt); err != nil {
		if isUniqueViolation(err) {
			jsonError(w, "declaration already submitted today", http.StatusConflict)
			return
		}
		slog.Error("create declaration", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	decl.Date = declDateRaw.Format("2006-01-02")

	// Insert commitments
	commitments := make([]map[string]interface{}, 0, len(req.Commitments))
	for _, c := range req.Commitments {
		cRow := h.db.QueryRow(r.Context(),
			`INSERT INTO commitments (declaration_id, user_id, title, type, intensity, tag)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING id, title, type, intensity, tag, status, slip_count, focus_time_sec, created_at`,
			decl.ID, userID, c.Title, c.Type, c.Intensity, c.Tag,
		)
		var cm map[string]interface{}
		var id, title, typ, intensity, status string
		var tag *string
		var slipCount int16
		var focusTimeSec int32
		var createdAt time.Time
		if err := cRow.Scan(&id, &title, &typ, &intensity, &tag, &status, &slipCount, &focusTimeSec, &createdAt); err != nil {
			slog.Error("insert commitment", "error", err)
			jsonError(w, "internal server error", http.StatusInternalServerError)
			return
		}
		cm = map[string]interface{}{
			"id": id, "title": title, "type": typ, "intensity": intensity,
			"tag": tag, "status": status, "slip_count": slipCount,
			"focus_time_sec": focusTimeSec, "created_at": createdAt,
		}
		commitments = append(commitments, cm)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":          decl.ID,
		"user_id":     decl.UserID,
		"date":        decl.Date,
		"submitted_at": decl.SubmittedAt,
		"commitments": commitments,
	})
}

// Today returns today's declaration and commitments.
// GET /api/v1/declarations/today
func (h *DeclarationHandler) Today(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	today := time.Now().Format("2006-01-02")

	row := h.db.QueryRow(r.Context(),
		`SELECT id, user_id, date, submitted_at FROM declarations WHERE user_id=$1 AND date=$2`,
		userID, today,
	)
	var declID, declUserID string
	var declDateRaw2 time.Time
	var declSubmitted time.Time
	if err := row.Scan(&declID, &declUserID, &declDateRaw2, &declSubmitted); err != nil {
		// No declaration today
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(nil)
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT id, title, type, intensity, tag, status, slip_count, honest_score,
		        focus_time_sec, completed_at, created_at
		 FROM commitments WHERE declaration_id=$1 ORDER BY created_at`,
		declID,
	)
	if err != nil {
		slog.Error("fetch commitments", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	commitments := []map[string]interface{}{}
	for rows.Next() {
		var id, title, typ, intensity, status string
		var tag *string
		var slipCount int16
		var honestScore *int16
		var focusTimeSec int32
		var completedAt *time.Time
		var createdAt time.Time
		if err := rows.Scan(&id, &title, &typ, &intensity, &tag, &status, &slipCount,
			&honestScore, &focusTimeSec, &completedAt, &createdAt); err != nil {
			continue
		}
		commitments = append(commitments, map[string]interface{}{
			"id": id, "title": title, "type": typ, "intensity": intensity,
			"tag": tag, "status": status, "slip_count": slipCount,
			"honest_score": honestScore, "focus_time_sec": focusTimeSec,
			"completed_at": completedAt, "created_at": createdAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":           declID,
		"user_id":      declUserID,
		"date":         declDateRaw2.Format("2006-01-02"),
		"submitted_at": declSubmitted,
		"commitments":  commitments,
	})
}

// History returns paginated past declarations.
// GET /api/v1/declarations/history
func (h *DeclarationHandler) History(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit := 30
	offset := (page - 1) * limit

	rows, err := h.db.Query(r.Context(),
		`SELECT id, user_id, date, submitted_at FROM declarations
		 WHERE user_id=$1 ORDER BY date DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		var id, uid string
		var dateRaw time.Time
		var submitted time.Time
		if err := rows.Scan(&id, &uid, &dateRaw, &submitted); err != nil {
			continue
		}
		result = append(result, map[string]interface{}{
			"id": id, "user_id": uid, "date": dateRaw.Format("2006-01-02"), "submitted_at": submitted,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": result, "page": page, "limit": limit,
	})
}

func validIntensity(s string) bool {
	return s == "soft" || s == "firm" || s == "non_negotiable"
}

func validTag(s string) bool {
	return s == "work" || s == "learning" || s == "health" || s == "relationships" || s == "other"
}
