package handlers

import (
	"encoding/json"
	"log/slog"
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/middleware"
)

type RecurringCommitmentHandler struct {
	db *pgxpool.Pool
}

func NewRecurringCommitmentHandler(db *pgxpool.Pool) *RecurringCommitmentHandler {
	return &RecurringCommitmentHandler{db: db}
}

// userTZ returns the user's timezone location.
func (h *RecurringCommitmentHandler) userTZ(r *http.Request, userID string) *time.Location {
	var tz string
	h.db.QueryRow(r.Context(), `SELECT timezone FROM users WHERE id=$1`, userID).Scan(&tz)
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return time.UTC
	}
	return loc
}

// Create makes a new long-running commitment.
// POST /api/v1/commitments/recurring
func (h *RecurringCommitmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	var body struct {
		Name         string  `json:"name"`
		Emoji        string  `json:"emoji"`
		Color        string  `json:"color"`
		Description  string  `json:"description"`
		TargetMinDay *int    `json:"target_min_day"`
		PeriodDays   int     `json:"period_days"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		jsonError(w, "name is required", http.StatusUnprocessableEntity)
		return
	}
	if body.Emoji == "" {
		body.Emoji = "⚡"
	}
	if body.Color == "" {
		body.Color = "green"
	}
	if body.PeriodDays <= 0 {
		body.PeriodDays = 30
	}

	loc := h.userTZ(r, userID)
	today := time.Now().In(loc).Format("2006-01-02")
	endDate := time.Now().In(loc).AddDate(0, 0, body.PeriodDays).Format("2006-01-02")

	var id string
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO recurring_commitments
		   (user_id, name, emoji, color, description, target_min_day, period_days, start_date, end_date)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		 RETURNING id`,
		userID, body.Name, body.Emoji, body.Color, body.Description,
		body.TargetMinDay, body.PeriodDays, today, endDate,
	).Scan(&id)
	if err != nil {
		slog.Error("create recurring commitment", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": id, "name": body.Name, "emoji": body.Emoji, "color": body.Color,
		"period_days": body.PeriodDays, "start_date": today, "end_date": endDate,
		"status": "active",
	})
}

// List returns all active recurring commitments for the user.
// GET /api/v1/commitments/recurring
func (h *RecurringCommitmentHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	includeArchived := r.URL.Query().Get("archived") == "true"

	query := `SELECT id, name, emoji, color, description, target_min_day,
	                 period_days, start_date, end_date, status, created_at
	          FROM recurring_commitments
	          WHERE user_id=$1`
	if !includeArchived {
		query += ` AND status != 'archived'`
	}
	query += ` ORDER BY created_at DESC`

	rows, err := h.db.Query(r.Context(), query, userID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		if c := scanCommitmentRow(rows); c != nil {
			result = append(result, c)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Get returns detail + full log history for one commitment.
// GET /api/v1/commitments/recurring/:id
func (h *RecurringCommitmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	var c map[string]interface{}
	row := h.db.QueryRow(r.Context(),
		`SELECT id, name, emoji, color, description, target_min_day,
		        period_days, start_date, end_date, status, created_at
		 FROM recurring_commitments WHERE id=$1 AND user_id=$2`, id, userID,
	)
	if c = scanCommitmentRow(row); c == nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	// Logs for last 365 days
	logs, _ := h.db.Query(r.Context(),
		`SELECT date, duration_minutes, time_start, time_end, note
		 FROM commitment_logs
		 WHERE commitment_id=$1
		   AND date > now() - interval '1 year'
		 ORDER BY date`,
		id,
	)
	defer logs.Close()
	logList := []map[string]interface{}{}
	for logs.Next() {
		var date time.Time
		var mins int
		var ts, te *string
		var note *string
		if err := logs.Scan(&date, &mins, &ts, &te, &note); err == nil {
			logList = append(logList, map[string]interface{}{
				"date":             date.Format("2006-01-02"),
				"duration_minutes": mins,
				"time_start":       ts,
				"time_end":         te,
				"note":             note,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"commitment": c, "logs": logList})
}

// Update patches mutable fields.
// PATCH /api/v1/commitments/recurring/:id
func (h *RecurringCommitmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")
	var body struct {
		Name         *string `json:"name"`
		Emoji        *string `json:"emoji"`
		Color        *string `json:"color"`
		Description  *string `json:"description"`
		TargetMinDay *int    `json:"target_min_day"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	res, err := h.db.Exec(r.Context(),
		`UPDATE recurring_commitments SET
		   name          = COALESCE($3, name),
		   emoji         = COALESCE($4, emoji),
		   color         = COALESCE($5, color),
		   description   = COALESCE($6, description),
		   target_min_day = COALESCE($7, target_min_day)
		 WHERE id=$1 AND user_id=$2`,
		id, userID, body.Name, body.Emoji, body.Color, body.Description, body.TargetMinDay,
	)
	if err != nil || res.RowsAffected() == 0 {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Archive soft-deletes a commitment.
// DELETE /api/v1/commitments/recurring/:id
func (h *RecurringCommitmentHandler) Archive(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")
	h.db.Exec(r.Context(),
		`UPDATE recurring_commitments SET status='archived' WHERE id=$1 AND user_id=$2`,
		id, userID,
	)
	w.WriteHeader(http.StatusNoContent)
}

// Renew starts a new period from today.
// POST /api/v1/commitments/recurring/:id/renew
func (h *RecurringCommitmentHandler) Renew(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	loc := h.userTZ(r, userID)
	today := time.Now().In(loc)

	var periodDays int
	if err := h.db.QueryRow(r.Context(),
		`SELECT period_days FROM recurring_commitments WHERE id=$1 AND user_id=$2`,
		id, userID,
	).Scan(&periodDays); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	newEnd := today.AddDate(0, 0, periodDays).Format("2006-01-02")
	h.db.Exec(r.Context(),
		`UPDATE recurring_commitments
		 SET start_date=$3, end_date=$4, status='active'
		 WHERE id=$1 AND user_id=$2`,
		id, userID, today.Format("2006-01-02"), newEnd,
	)
	w.WriteHeader(http.StatusNoContent)
}

// LogTime adds or updates a time log for today/yesterday.
// POST /api/v1/commitments/recurring/:id/logs
func (h *RecurringCommitmentHandler) LogTime(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	var body struct {
		Date            string  `json:"date"`           // YYYY-MM-DD, defaults to today
		DurationMinutes int     `json:"duration_minutes"`
		TimeStart       *string `json:"time_start"`     // "HH:MM" optional
		TimeEnd         *string `json:"time_end"`       // "HH:MM" optional
		Note            *string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if body.DurationMinutes <= 0 {
		jsonError(w, "duration_minutes must be positive", http.StatusUnprocessableEntity)
		return
	}

	loc := h.userTZ(r, userID)
	today := time.Now().In(loc).Format("2006-01-02")
	yesterday := time.Now().In(loc).AddDate(0, 0, -1).Format("2006-01-02")
	if body.Date == "" {
		body.Date = today
	}
	if body.Date != today && body.Date != yesterday {
		jsonError(w, "can only log today or yesterday", http.StatusForbidden)
		return
	}

	// Verify ownership
	var exists bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM recurring_commitments WHERE id=$1 AND user_id=$2 AND status='active')`,
		id, userID,
	).Scan(&exists)
	if !exists {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	var logID string
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO commitment_logs (commitment_id, user_id, date, duration_minutes, time_start, time_end, note)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)
		 ON CONFLICT (commitment_id, date) DO UPDATE
		   SET duration_minutes=$4, time_start=$5, time_end=$6, note=$7
		 RETURNING id`,
		id, userID, body.Date, body.DurationMinutes, body.TimeStart, body.TimeEnd, body.Note,
	).Scan(&logID)
	if err != nil {
		slog.Error("log time", "error", err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": logID, "date": body.Date, "duration_minutes": body.DurationMinutes,
	})
}

// DeleteLog removes a log entry (today/yesterday only).
// DELETE /api/v1/commitments/recurring/:id/logs/:date
func (h *RecurringCommitmentHandler) DeleteLog(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")
	date := chi.URLParam(r, "date")

	loc := h.userTZ(r, userID)
	today := time.Now().In(loc).Format("2006-01-02")
	yesterday := time.Now().In(loc).AddDate(0, 0, -1).Format("2006-01-02")
	if date != today && date != yesterday {
		jsonError(w, "entries older than yesterday are locked", http.StatusForbidden)
		return
	}

	h.db.Exec(r.Context(),
		`DELETE FROM commitment_logs
		 WHERE commitment_id=$1 AND user_id=$2 AND date=$3`,
		id, userID, date,
	)
	w.WriteHeader(http.StatusNoContent)
}

// WeeklyStats returns last 8 weeks of total minutes per week.
// GET /api/v1/commitments/recurring/:id/stats/weekly
func (h *RecurringCommitmentHandler) WeeklyStats(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	// Verify ownership
	var exists bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM recurring_commitments WHERE id=$1 AND user_id=$2)`,
		id, userID,
	).Scan(&exists)
	if !exists {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT date_trunc('week', date) AS week_start,
		        SUM(duration_minutes) AS total_minutes,
		        COUNT(*) AS days_logged
		 FROM commitment_logs
		 WHERE commitment_id=$1
		   AND date > now() - interval '8 weeks'
		 GROUP BY week_start
		 ORDER BY week_start`,
		id,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		var weekStart time.Time
		var totalMin, daysLogged int
		if err := rows.Scan(&weekStart, &totalMin, &daysLogged); err == nil {
			result = append(result, map[string]interface{}{
				"week":         weekStart.Format("2006-01-02"),
				"total_minutes": totalMin,
				"days_logged":  daysLogged,
			})
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// MonthlyStats returns last 12 months of total minutes per month.
// GET /api/v1/commitments/recurring/:id/stats/monthly
func (h *RecurringCommitmentHandler) MonthlyStats(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	var exists bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM recurring_commitments WHERE id=$1 AND user_id=$2)`,
		id, userID,
	).Scan(&exists)
	if !exists {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT date_trunc('month', date) AS month_start,
		        SUM(duration_minutes) AS total_minutes,
		        COUNT(*) AS days_logged
		 FROM commitment_logs
		 WHERE commitment_id=$1
		   AND date > now() - interval '12 months'
		 GROUP BY month_start
		 ORDER BY month_start`,
		id,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		var monthStart time.Time
		var totalMin, daysLogged int
		if err := rows.Scan(&monthStart, &totalMin, &daysLogged); err == nil {
			result = append(result, map[string]interface{}{
				"month":         monthStart.Format("2006-01"),
				"total_minutes": totalMin,
				"days_logged":   daysLogged,
			})
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Today returns all active commitments with today's log status.
// GET /api/v1/commitments/today
func (h *RecurringCommitmentHandler) Today(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	loc := h.userTZ(r, userID)
	today := time.Now().In(loc).Format("2006-01-02")

	rows, err := h.db.Query(r.Context(),
		`SELECT rc.id, rc.name, rc.emoji, rc.color, rc.target_min_day,
		        rc.end_date, rc.period_days, rc.start_date,
		        cl.duration_minutes, cl.time_start, cl.time_end, cl.note
		 FROM recurring_commitments rc
		 LEFT JOIN commitment_logs cl
		   ON cl.commitment_id=rc.id AND cl.date=$2
		 WHERE rc.user_id=$1 AND rc.status='active'
		 ORDER BY rc.created_at`,
		userID, today,
	)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		var id, name, emoji, color string
		var targetMin *int
		var endDate, startDate time.Time
		var periodDays int
		var logMins *int
		var ts, te, note *string
		if err := rows.Scan(&id, &name, &emoji, &color, &targetMin,
			&endDate, &periodDays, &startDate,
			&logMins, &ts, &te, &note); err == nil {
			result = append(result, map[string]interface{}{
				"id": id, "name": name, "emoji": emoji, "color": color,
				"target_min_day":   targetMin,
				"end_date":         endDate.Format("2006-01-02"),
				"start_date":       startDate.Format("2006-01-02"),
				"period_days":      periodDays,
				"today_logged":     logMins != nil,
				"today_minutes":    logMins,
				"today_time_start": ts,
				"today_time_end":   te,
				"today_note":       note,
			})
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Share generates (or returns existing) a share token for a commitment.
// POST /api/v1/commitments/recurring/:id/share
func (h *RecurringCommitmentHandler) Share(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	id := chi.URLParam(r, "id")

	// Verify ownership
	var exists bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM recurring_commitments WHERE id=$1 AND user_id=$2)`,
		id, userID,
	).Scan(&exists)
	if !exists {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	var token string
	// Return existing token or create new one
	if err := h.db.QueryRow(r.Context(),
		`SELECT token FROM commitment_shares WHERE commitment_id=$1`, id,
	).Scan(&token); err != nil {
		if err2 := h.db.QueryRow(r.Context(),
			`INSERT INTO commitment_shares (commitment_id) VALUES ($1) RETURNING token`, id,
		).Scan(&token); err2 != nil {
			jsonError(w, "internal server error", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

// PublicShare returns public read-only data for a shared commitment (no auth).
// GET /api/v1/share/:token
func (h *RecurringCommitmentHandler) PublicShare(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	var commitmentID string
	if err := h.db.QueryRow(r.Context(),
		`SELECT commitment_id FROM commitment_shares WHERE token=$1`, token,
	).Scan(&commitmentID); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	var name, emoji, color string
	var periodDays int
	var startDate, endDate time.Time
	if err := h.db.QueryRow(r.Context(),
		`SELECT name, emoji, color, period_days, start_date, end_date
		 FROM recurring_commitments WHERE id=$1`, commitmentID,
	).Scan(&name, &emoji, &color, &periodDays, &startDate, &endDate); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	// Logs for last 365 days
	logRows, _ := h.db.Query(r.Context(),
		`SELECT date, duration_minutes FROM commitment_logs
		 WHERE commitment_id=$1 AND date > now() - interval '1 year'
		 ORDER BY date`, commitmentID,
	)
	defer logRows.Close()
	logs := []map[string]interface{}{}
	var totalMins int
	for logRows.Next() {
		var d time.Time
		var mins int
		if err := logRows.Scan(&d, &mins); err == nil {
			logs = append(logs, map[string]interface{}{
				"date": d.Format("2006-01-02"), "duration_minutes": mins,
			})
			totalMins += mins
		}
	}

	// Streak calculation
	streak := calcCommitmentStreak(logs)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"name": name, "emoji": emoji, "color": color,
		"period_days": periodDays,
		"start_date":  startDate.Format("2006-01-02"),
		"end_date":    endDate.Format("2006-01-02"),
		"logs":        logs,
		"streak":      streak,
		"total_hours": math.Round(float64(totalMins)/60*10) / 10,
		"days_logged": len(logs),
	})
}

// calcCommitmentStreak computes streak from a slice of log maps (asc date order).
func calcCommitmentStreak(logs []map[string]interface{}) int {
	if len(logs) == 0 {
		return 0
	}
	today := time.Now().Truncate(24 * time.Hour)
	present := make(map[string]bool)
	for _, l := range logs {
		if d, ok := l["date"].(string); ok {
			present[d] = true
		}
	}
	streak := 0
	for i := 0; ; i++ {
		day := today.AddDate(0, 0, -i)
		if present[day.Format("2006-01-02")] {
			streak++
		} else if i > 0 {
			break
		}
		if i > 400 {
			break
		}
	}
	return streak
}

// scanCommitmentRow scans a single recurring commitment row.
type rcRow interface {
	Scan(dest ...interface{}) error
}

func scanCommitmentRow(row rcRow) map[string]interface{} {
	var id, name, emoji, color, status string
	var desc *string
	var targetMin *int
	var periodDays int
	var startDate, endDate, createdAt time.Time
	if err := row.Scan(&id, &name, &emoji, &color, &desc, &targetMin,
		&periodDays, &startDate, &endDate, &status, &createdAt); err != nil {
		return nil
	}
	return map[string]interface{}{
		"id": id, "name": name, "emoji": emoji, "color": color,
		"description": desc, "target_min_day": targetMin,
		"period_days": periodDays,
		"start_date":  startDate.Format("2006-01-02"),
		"end_date":    endDate.Format("2006-01-02"),
		"status":      status,
		"created_at":  createdAt,
	}
}
