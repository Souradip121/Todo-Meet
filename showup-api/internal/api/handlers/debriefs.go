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

	go jobs.UpsertTodayScore(context.Background(), h.db, userID)

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

	// Streak is now based on commitment_logs (not debriefs)
	rows, err := h.db.Query(r.Context(),
		`SELECT DISTINCT date FROM commitment_logs WHERE user_id=$1 ORDER BY date DESC LIMIT 400`,
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

	// Also load freeze dates so frozen days don't break the streak
	fRows, _ := h.db.Query(r.Context(),
		`SELECT date FROM streak_freeze_uses WHERE user_id=$1 ORDER BY date DESC LIMIT 400`,
		userID,
	)
	var freezeDates []time.Time
	if fRows != nil {
		defer fRows.Close()
		for fRows.Next() {
			var d time.Time
			if err := fRows.Scan(&d); err == nil {
				freezeDates = append(freezeDates, d)
			}
		}
	}

	// Also return freeze balance from users table
	var freezesRemaining int16
	h.db.QueryRow(r.Context(),
		`SELECT streak_freezes_remaining FROM users WHERE id=$1`, userID,
	).Scan(&freezesRemaining)

	streak := calcStreak(dates, freezeDates)
	streak.FreezesRemaining = int(freezesRemaining)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(streak)
}

// FreezeStreak uses one of the user's streak freezes for today.
// POST /api/v1/streaks/freeze
func (h *DebriefHandler) FreezeStreak(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())

	var freezes int16
	if err := h.db.QueryRow(r.Context(),
		`SELECT streak_freezes_remaining FROM users WHERE id=$1`, userID,
	).Scan(&freezes); err != nil || freezes <= 0 {
		jsonError(w, "no streak freezes remaining", http.StatusConflict)
		return
	}

	var tz string
	h.db.QueryRow(r.Context(), `SELECT timezone FROM users WHERE id=$1`, userID).Scan(&tz)
	loc, _ := time.LoadLocation(tz)
	if loc == nil {
		loc = time.UTC
	}
	today := time.Now().In(loc).Format("2006-01-02")

	_, err := h.db.Exec(r.Context(),
		`INSERT INTO streak_freeze_uses (user_id, date) VALUES ($1, $2)
		 ON CONFLICT (user_id, date) DO NOTHING`,
		userID, today,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	h.db.Exec(r.Context(),
		`UPDATE users SET streak_freezes_remaining = streak_freezes_remaining - 1 WHERE id=$1`,
		userID,
	)

	w.WriteHeader(http.StatusNoContent)
}

// calcStreak computes streak counts from debrief dates + freeze dates.
// Both slices are desc-ordered. Freeze dates count as "present" days.
func calcStreak(dates []time.Time, freezeDates []time.Time) models.StreakData {
	// Build a set of all "present" days (debrief OR freeze)
	present := make(map[string]bool)
	for _, d := range dates {
		present[d.Truncate(24*time.Hour).Format("2006-01-02")] = true
	}
	for _, d := range freezeDates {
		present[d.Truncate(24*time.Hour).Format("2006-01-02")] = true
	}

	if len(present) == 0 {
		return models.StreakData{}
	}

	today := time.Now().Truncate(24 * time.Hour)
	current := 0
	longest := 0

	// Walk backward from today counting consecutive present days
	streak := 0
	for i := 0; ; i++ {
		day := today.AddDate(0, 0, -i)
		key := day.Format("2006-01-02")
		if present[key] {
			streak++
			if streak > longest {
				longest = streak
			}
			if i <= 1 { // today or yesterday counts toward current
				current = streak
			}
		} else if i > 0 {
			// Gap found — stop walking back for current streak
			break
		}
		if i > 400 {
			break
		}
	}

	return models.StreakData{
		Current:     current,
		LongestEver: longest,
	}
}
