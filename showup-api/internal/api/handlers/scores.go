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

type ScoreHandler struct {
	db *pgxpool.Pool
}

func NewScoreHandler(db *pgxpool.Pool) *ScoreHandler {
	return &ScoreHandler{db: db}
}

// Grid returns the full year of daily scores (365 cells).
// GET /api/v1/scores/grid
// GET /api/v1/scores/grid?tag=work
func (h *ScoreHandler) Grid(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	tag := r.URL.Query().Get("tag")

	var rows interface{ Next() bool; Scan(...interface{}) error; Close() }
	var err error

	if tag != "" {
		// Filter: only include days where the user had commitments matching the tag
		rows, err = h.db.Query(r.Context(),
			`SELECT ds.date, ds.score, ds.breakdown
			 FROM daily_scores ds
			 WHERE ds.user_id = $1
			   AND ds.date > now() - interval '1 year'
			   AND EXISTS (
			     SELECT 1 FROM commitments c
			     WHERE c.user_id = ds.user_id
			       AND c.created_at::date = ds.date
			       AND c.tag = $2
			   )
			 ORDER BY ds.date`,
			userID, tag,
		)
	} else {
		rows, err = h.db.Query(r.Context(),
			`SELECT date, score, breakdown FROM daily_scores
			 WHERE user_id=$1 AND date > now() - interval '1 year'
			 ORDER BY date`,
			userID,
		)
	}
	if err != nil {
		slog.Error("grid query", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []models.DayScore{}
	for rows.Next() {
		var date time.Time
		var score int16
		var breakdownRaw string
		if err := rows.Scan(&date, &score, &breakdownRaw); err != nil {
			continue
		}
		var bd models.ScoreBreakdown
		json.Unmarshal([]byte(breakdownRaw), &bd)
		result = append(result, models.DayScore{
			Date:      date.Format("2006-01-02"),
			Score:     score,
			Breakdown: bd,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Day returns a single day's score and full replay data.
// GET /api/v1/scores/day/:date
func (h *ScoreHandler) Day(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	date := chi.URLParam(r, "date")

	if _, err := time.Parse("2006-01-02", date); err != nil {
		jsonError(w, "date must be YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	// Score
	var score int16
	var breakdownRaw string
	scoreErr := h.db.QueryRow(r.Context(),
		`SELECT score, breakdown FROM daily_scores WHERE user_id=$1 AND date=$2`,
		userID, date,
	).Scan(&score, &breakdownRaw)

	// Commitments for that day
	cRows, _ := h.db.Query(r.Context(),
		`SELECT id, title, intensity, status, focus_time_sec, honest_score FROM commitments
		 WHERE user_id=$1 AND created_at::date=$2 ORDER BY created_at`,
		userID, date,
	)
	defer cRows.Close()
	commitments := []map[string]interface{}{}
	for cRows.Next() {
		var id, title, intensity, status string
		var focusTime int32
		var hs *int16
		if err := cRows.Scan(&id, &title, &intensity, &status, &focusTime, &hs); err == nil {
			commitments = append(commitments, map[string]interface{}{
				"id": id, "title": title, "intensity": intensity,
				"status": status, "focus_time_sec": focusTime, "honest_score": hs,
			})
		}
	}

	// Debrief for that day
	var debrief *models.EODDebrief
	var d models.EODDebrief
	if err := h.db.QueryRow(r.Context(),
		`SELECT id, user_id, date, what_moved, what_didnt, mood, energy, submitted_at
		 FROM eod_debriefs WHERE user_id=$1 AND date=$2`,
		userID, date,
	).Scan(&d.ID, &d.UserID, &d.Date, &d.WhatMoved, &d.WhatDidnt, &d.Mood, &d.Energy, &d.SubmittedAt); err == nil {
		debrief = &d
	}

	var bd models.ScoreBreakdown
	if scoreErr == nil {
		json.Unmarshal([]byte(breakdownRaw), &bd)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"date":        date,
		"score":       score,
		"breakdown":   bd,
		"commitments": commitments,
		"debrief":     debrief,
	})
}

// Weekly returns the last 7 days of scores for the dashboard summary card.
// GET /api/v1/scores/weekly
func (h *ScoreHandler) Weekly(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())

	rows, err := h.db.Query(r.Context(),
		`SELECT date, score, breakdown FROM daily_scores
		 WHERE user_id=$1 AND date >= CURRENT_DATE - interval '7 days'
		 ORDER BY date`,
		userID,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []models.DayScore{}
	for rows.Next() {
		var date time.Time
		var score int16
		var bdRaw string
		if err := rows.Scan(&date, &score, &bdRaw); err != nil {
			continue
		}
		var bd models.ScoreBreakdown
		json.Unmarshal([]byte(bdRaw), &bd)
		result = append(result, models.DayScore{
			Date: date.Format("2006-01-02"), Score: score, Breakdown: bd,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
