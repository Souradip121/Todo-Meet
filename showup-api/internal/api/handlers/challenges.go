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

type ChallengeHandler struct {
	db *pgxpool.Pool
}

func NewChallengeHandler(db *pgxpool.Pool) *ChallengeHandler {
	return &ChallengeHandler{db: db}
}

// List returns active and upcoming challenges with participant counts and the caller's participation status.
// GET /api/v1/challenges?status=active|upcoming
func (h *ChallengeHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	status := r.URL.Query().Get("status") // optional filter

	query := `
		SELECT c.id, c.title, c.category, c.duration_days, c.check_in_rule,
		       c.start_date, c.end_date, c.status, c.is_official, c.stakes_enabled, c.rules,
		       COUNT(DISTINCT cp.user_id) AS participant_count,
		       COUNT(DISTINCT cp2.user_id) AS still_going,
		       COALESCE(SUM(cp.stake_amount_paise), 0) AS total_staked_paise,
		       bool_or(cp_me.user_id IS NOT NULL) AS joined
		FROM challenges c
		LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
		LEFT JOIN challenge_participants cp2 ON cp2.challenge_id = c.id AND cp2.current_streak > 0
		LEFT JOIN challenge_participants cp_me ON cp_me.challenge_id = c.id AND cp_me.user_id = $1
		WHERE c.status != 'ended'`

	args := []interface{}{userID}
	if status != "" {
		query += ` AND c.status = $2`
		args = append(args, status)
	}
	query += ` GROUP BY c.id ORDER BY participant_count DESC, c.start_date ASC`

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		slog.Error("challenges list", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Challenge struct {
		ID               string    `json:"id"`
		Title            string    `json:"title"`
		Category         string    `json:"category"`
		DurationDays     int       `json:"duration_days"`
		CheckInRule      string    `json:"check_in_rule"`
		StartDate        string    `json:"start_date"`
		EndDate          string    `json:"end_date"`
		Status           string    `json:"status"`
		IsOfficial       bool      `json:"is_official"`
		StakesEnabled    bool      `json:"stakes_enabled"`
		Rules            []string  `json:"rules"`
		ParticipantCount int       `json:"participant_count"`
		StillGoing       int       `json:"still_going"`
		TotalStakedPaise int64     `json:"total_staked_paise"`
		Joined           bool      `json:"joined"`
		DayNumber        int       `json:"day_number"`
		DaysRemaining    int       `json:"days_remaining"`
	}

	result := []Challenge{}
	for rows.Next() {
		var c Challenge
		var startDate, endDate time.Time
		var rulesJSON string
		if err := rows.Scan(&c.ID, &c.Title, &c.Category, &c.DurationDays, &c.CheckInRule,
			&startDate, &endDate, &c.Status, &c.IsOfficial, &c.StakesEnabled, &rulesJSON,
			&c.ParticipantCount, &c.StillGoing, &c.TotalStakedPaise, &c.Joined); err != nil {
			continue
		}
		c.StartDate = startDate.Format("2006-01-02")
		c.EndDate = endDate.Format("2006-01-02")
		json.Unmarshal([]byte(rulesJSON), &c.Rules)
		now := time.Now()
		if now.After(startDate) {
			c.DayNumber = int(now.Sub(startDate).Hours()/24) + 1
		}
		c.DaysRemaining = int(endDate.Sub(now).Hours()/24) + 1
		if c.DaysRemaining < 0 {
			c.DaysRemaining = 0
		}
		result = append(result, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Get returns a single challenge with full details.
// GET /api/v1/challenges/{id}
func (h *ChallengeHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	var title, category, checkInRule, status, rulesJSON string
	var durationDays int
	var startDate, endDate time.Time
	var isOfficial, stakesEnabled bool
	var participantCount int
	var totalStakedPaise int64
	var joined bool

	err := h.db.QueryRow(r.Context(),
		`SELECT c.title, c.category, c.duration_days, c.check_in_rule, c.start_date, c.end_date,
		        c.status, c.is_official, c.stakes_enabled, c.rules,
		        COUNT(DISTINCT cp.user_id), COALESCE(SUM(cp.stake_amount_paise),0),
		        bool_or(cp_me.user_id IS NOT NULL)
		 FROM challenges c
		 LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
		 LEFT JOIN challenge_participants cp_me ON cp_me.challenge_id = c.id AND cp_me.user_id = $2
		 WHERE c.id = $1
		 GROUP BY c.id`,
		id, userID,
	).Scan(&title, &category, &durationDays, &checkInRule, &startDate, &endDate,
		&status, &isOfficial, &stakesEnabled, &rulesJSON,
		&participantCount, &totalStakedPaise, &joined)
	if err != nil {
		jsonError(w, "challenge not found", http.StatusNotFound)
		return
	}

	var rules []string
	json.Unmarshal([]byte(rulesJSON), &rules)

	now := time.Now()
	dayNumber := 0
	if now.After(startDate) {
		dayNumber = int(now.Sub(startDate).Hours()/24) + 1
	}
	daysRemaining := int(endDate.Sub(now).Hours()/24) + 1

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": id, "title": title, "category": category,
		"duration_days": durationDays, "check_in_rule": checkInRule,
		"start_date": startDate.Format("2006-01-02"), "end_date": endDate.Format("2006-01-02"),
		"status": status, "is_official": isOfficial, "stakes_enabled": stakesEnabled,
		"rules": rules, "participant_count": participantCount,
		"total_staked_paise": totalStakedPaise, "joined": joined,
		"day_number": dayNumber, "days_remaining": daysRemaining,
	})
}

// Join adds the caller to a challenge.
// POST /api/v1/challenges/{id}/join
func (h *ChallengeHandler) Join(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	var body struct {
		StakeAmountPaise int `json:"stake_amount_paise"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	// Verify challenge exists and is joinable
	var status string
	if err := h.db.QueryRow(r.Context(),
		`SELECT status FROM challenges WHERE id = $1`, id,
	).Scan(&status); err != nil {
		jsonError(w, "challenge not found", http.StatusNotFound)
		return
	}
	if status == "ended" {
		jsonError(w, "challenge has ended", http.StatusUnprocessableEntity)
		return
	}

	_, err := h.db.Exec(r.Context(),
		`INSERT INTO challenge_participants (challenge_id, user_id, stake_amount_paise)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (challenge_id, user_id) DO NOTHING`,
		id, userID, body.StakeAmountPaise,
	)
	if err != nil {
		slog.Error("challenge join", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Checkin records a daily check-in for the caller in a challenge.
// POST /api/v1/challenges/{id}/checkin
func (h *ChallengeHandler) Checkin(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	var body struct {
		PhotoURL string `json:"photo_url"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	today := time.Now().UTC().Format("2006-01-02")

	// Ensure user is a participant
	var exists bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM challenge_participants WHERE challenge_id=$1 AND user_id=$2)`,
		id, userID,
	).Scan(&exists)
	if !exists {
		jsonError(w, "not a participant — join first", http.StatusUnprocessableEntity)
		return
	}

	// Insert checkin (unique constraint prevents double check-in)
	var photoArg *string
	if body.PhotoURL != "" {
		photoArg = &body.PhotoURL
	}
	_, err := h.db.Exec(r.Context(),
		`INSERT INTO challenge_checkins (challenge_id, user_id, date, photo_url)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (challenge_id, user_id, date) DO NOTHING`,
		id, userID, today, photoArg,
	)
	if err != nil {
		slog.Error("challenge checkin insert", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Update streak counters
	_, err = h.db.Exec(r.Context(),
		`UPDATE challenge_participants
		 SET total_checkins = total_checkins + 1,
		     current_streak = CASE
		       WHEN last_checkin_date = CURRENT_DATE - 1 OR last_checkin_date IS NULL
		       THEN current_streak + 1
		       ELSE 1
		     END,
		     last_checkin_date = CURRENT_DATE
		 WHERE challenge_id = $1 AND user_id = $2
		   AND (last_checkin_date IS NULL OR last_checkin_date < CURRENT_DATE)`,
		id, userID,
	)
	if err != nil {
		slog.Error("challenge streak update", "error", err)
	}

	w.WriteHeader(http.StatusNoContent)
}

// Leaderboard returns the ranked participant list for a challenge.
// GET /api/v1/challenges/{id}/leaderboard?period=weekly|alltime
func (h *ChallengeHandler) Leaderboard(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")
	period := r.URL.Query().Get("period")

	var query string
	if period == "weekly" {
		// Use CTE to pre-aggregate weekly checkins — correlated subquery not allowed inside RANK() OVER
		query = `
			WITH weekly AS (
			  SELECT user_id, COUNT(*) AS week_checkins
			  FROM challenge_checkins
			  WHERE challenge_id = $1 AND date >= CURRENT_DATE - 6
			  GROUP BY user_id
			)
			SELECT u.id, u.display_name, u.username, u.avatar_url,
			       cp.current_streak, cp.total_checkins,
			       RANK() OVER (ORDER BY COALESCE(w.week_checkins, 0) DESC, cp.current_streak DESC) AS rank
			FROM challenge_participants cp
			JOIN users u ON u.id = cp.user_id
			LEFT JOIN weekly w ON w.user_id = cp.user_id
			WHERE cp.challenge_id = $1
			ORDER BY rank ASC
			LIMIT 100`
	} else {
		query = `
			SELECT u.id, u.display_name, u.username, u.avatar_url,
			       cp.current_streak, cp.total_checkins,
			       RANK() OVER (ORDER BY cp.current_streak DESC, cp.total_checkins DESC, cp.joined_at ASC) AS rank
			FROM challenge_participants cp
			JOIN users u ON u.id = cp.user_id
			WHERE cp.challenge_id = $1
			ORDER BY rank ASC
			LIMIT 100`
	}

	rows, err := h.db.Query(r.Context(), query, id)
	if err != nil {
		slog.Error("leaderboard query", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Entry struct {
		UserID        string  `json:"user_id"`
		DisplayName   string  `json:"display_name"`
		Username      string  `json:"username"`
		AvatarURL     *string `json:"avatar_url"`
		CurrentStreak int     `json:"current_streak"`
		TotalCheckins int     `json:"total_checkins"`
		Rank          int64   `json:"rank"`
		IsMe          bool    `json:"is_me"`
	}

	entries := []Entry{}
	var myEntry *Entry
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.UserID, &e.DisplayName, &e.Username, &e.AvatarURL,
			&e.CurrentStreak, &e.TotalCheckins, &e.Rank); err != nil {
			continue
		}
		e.IsMe = e.UserID == userID
		if e.IsMe {
			myEntry = &e
		}
		entries = append(entries, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"entries":  entries,
		"my_entry": myEntry,
	})
}
