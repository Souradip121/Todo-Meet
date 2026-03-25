package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/middleware"
	"github.com/Souradip121/showup-api/internal/models"
)

type DebriefHandler struct {
	db *pgxpool.Pool
}

func NewDebriefHandler(db *pgxpool.Pool) *DebriefHandler {
	return &DebriefHandler{db: db}
}

type createDebriefRequest struct {
	WhatMoved *string `json:"what_moved"`
	WhatDidnt *string `json:"what_didnt"`
	Mood      *int16  `json:"mood"`
	Energy    *int16  `json:"energy"`
}

// Create submits the EOD debrief.
// POST /api/v1/debriefs
func (h *DebriefHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	var req createDebriefRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WhatMoved != nil && len(*req.WhatMoved) > 2000 {
		jsonError(w, "what_moved max 2000 characters", http.StatusUnprocessableEntity)
		return
	}
	if req.WhatDidnt != nil && len(*req.WhatDidnt) > 2000 {
		jsonError(w, "what_didnt max 2000 characters", http.StatusUnprocessableEntity)
		return
	}
	if req.Mood != nil && (*req.Mood < 1 || *req.Mood > 5) {
		jsonError(w, "mood must be between 1 and 5", http.StatusUnprocessableEntity)
		return
	}
	if req.Energy != nil && (*req.Energy < 1 || *req.Energy > 5) {
		jsonError(w, "energy must be between 1 and 5", http.StatusUnprocessableEntity)
		return
	}

	today := time.Now().Format("2006-01-02")

	row := h.db.QueryRow(r.Context(),
		`INSERT INTO eod_debriefs (user_id, date, what_moved, what_didnt, mood, energy)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (user_id, date) DO UPDATE
		   SET what_moved=$3, what_didnt=$4, mood=$5, energy=$6, submitted_at=now()
		 RETURNING id, user_id, date, what_moved, what_didnt, mood, energy, submitted_at`,
		userID, today, req.WhatMoved, req.WhatDidnt, req.Mood, req.Energy,
	)

	var d models.EODDebrief
	var debriefDateRaw time.Time
	if err := row.Scan(&d.ID, &d.UserID, &debriefDateRaw, &d.WhatMoved, &d.WhatDidnt,
		&d.Mood, &d.Energy, &d.SubmittedAt); err != nil {
		slog.Error("create debrief", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	d.Date = debriefDateRaw.Format("2006-01-02")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(d)
}

// ByDate returns the debrief for a specific date.
// GET /api/v1/debriefs/:date
func (h *DebriefHandler) ByDate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	date := chi.URLParam(r, "date")

	// Validate date format
	if _, err := time.Parse("2006-01-02", date); err != nil {
		jsonError(w, "date must be YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	row := h.db.QueryRow(r.Context(),
		`SELECT id, user_id, date, what_moved, what_didnt, mood, energy, submitted_at
		 FROM eod_debriefs WHERE user_id=$1 AND date=$2`,
		userID, date,
	)

	var d models.EODDebrief
	var byDateRaw time.Time
	if err := row.Scan(&d.ID, &d.UserID, &byDateRaw, &d.WhatMoved, &d.WhatDidnt,
		&d.Mood, &d.Energy, &d.SubmittedAt); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(nil)
		return
	}
	d.Date = byDateRaw.Format("2006-01-02")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(d)
}

// Streak returns streak counts for the authenticated user.
// GET /api/v1/debriefs/streak
func (h *DebriefHandler) Streak(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())

	rows, err := h.db.Query(r.Context(),
		`SELECT date FROM eod_debriefs WHERE user_id=$1 ORDER BY date DESC LIMIT 400`,
		userID,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var dates []time.Time
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err == nil {
			dates = append(dates, d)
		}
	}

	streak := calcStreak(dates)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(streak)
}

// calcStreak computes streak counts from a desc-ordered list of debrief dates.
func calcStreak(dates []time.Time) models.StreakData {
	if len(dates) == 0 {
		return models.StreakData{}
	}

	today := time.Now().Truncate(24 * time.Hour)
	current := 0
	longest := 0
	streak := 0
	prev := today

	for _, d := range dates {
		d = d.Truncate(24 * time.Hour)
		diff := int(prev.Sub(d).Hours() / 24)
		if diff <= 1 {
			streak++
			if streak > longest {
				longest = streak
			}
			if current == 0 && (d.Equal(today) || d.Equal(today.Add(-24*time.Hour))) {
				current = streak
			}
		} else {
			streak = 1
		}
		prev = d
	}
	if current == 0 && streak > 0 {
		current = streak
	}

	return models.StreakData{
		Current:     current,
		LongestEver: longest,
	}
}
