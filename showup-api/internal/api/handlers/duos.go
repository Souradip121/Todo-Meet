package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/api/middleware"
)

type DuoHandler struct {
	db *pgxpool.Pool
}

func NewDuoHandler(db *pgxpool.Pool) *DuoHandler {
	return &DuoHandler{db: db}
}

// GetDuoDetail returns duo-specific data: shared streak, both_logged_today, individual streaks.
// GET /api/v1/groups/:id/duo
func (h *DuoHandler) GetDuoDetail(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFrom(r.Context())
	groupID := chi.URLParam(r, "id")

	// Verify caller is a member of a duo
	var groupType string
	if err := h.db.QueryRow(r.Context(),
		`SELECT type FROM groups WHERE id=$1 AND status='active'`, groupID,
	).Scan(&groupType); err != nil || groupType != "duo" {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	var isMember bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2)`,
		groupID, userID,
	).Scan(&isMember)
	if !isMember {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	today := time.Now().UTC().Format("2006-01-02")

	// Duo streak (both members logged on consecutive days)
	var duoStreak int
	h.db.QueryRow(r.Context(), `
		WITH both_logged AS (
		  SELECT cl.date FROM commitment_logs cl
		  WHERE cl.user_id IN (SELECT user_id FROM group_members WHERE group_id=$1)
		    AND cl.date <= $2
		  GROUP BY cl.date HAVING COUNT(DISTINCT cl.user_id) = 2
		),
		numbered AS (
		  SELECT date, (date - (ROW_NUMBER() OVER (ORDER BY date))::int) AS grp FROM both_logged
		)
		SELECT COALESCE(COUNT(*),0) FROM numbered
		WHERE grp = (SELECT grp FROM numbered ORDER BY date DESC LIMIT 1)
	`, groupID, today).Scan(&duoStreak)

	// Did both log today?
	var bothToday int
	h.db.QueryRow(r.Context(),
		`SELECT COUNT(DISTINCT user_id) FROM commitment_logs
		 WHERE user_id IN (SELECT user_id FROM group_members WHERE group_id=$1) AND date=$2`,
		groupID, today,
	).Scan(&bothToday)
	bothLoggedToday := bothToday == 2

	// Members with individual streaks + last 14 days logged
	mRows, _ := h.db.Query(r.Context(),
		`SELECT u.id, u.display_name, u.avatar_url, gm.role
		 FROM group_members gm JOIN users u ON u.id=gm.user_id
		 WHERE gm.group_id=$1 ORDER BY gm.joined_at`, groupID)
	defer mRows.Close()

	type memberInfo struct {
		UserID          string   `json:"user_id"`
		DisplayName     string   `json:"display_name"`
		AvatarURL       *string  `json:"avatar_url"`
		Role            string   `json:"role"`
		IndividualStreak int     `json:"individual_streak"`
		RecentDays      []string `json:"recent_days"`
	}

	var members []memberInfo
	for mRows.Next() {
		var m memberInfo
		if err := mRows.Scan(&m.UserID, &m.DisplayName, &m.AvatarURL, &m.Role); err != nil {
			continue
		}

		// Individual streak
		logDates, _ := h.db.Query(r.Context(),
			`SELECT DISTINCT date FROM commitment_logs WHERE user_id=$1 ORDER BY date DESC LIMIT 400`,
			m.UserID,
		)
		var dates []string
		for logDates.Next() {
			var d time.Time
			if err := logDates.Scan(&d); err == nil {
				dates = append(dates, d.Format("2006-01-02"))
			}
		}
		logDates.Close()
		m.IndividualStreak = calcIndividualStreak(dates, today)

		// Last 14 days logged
		recent, _ := h.db.Query(r.Context(),
			`SELECT DISTINCT date FROM commitment_logs
			 WHERE user_id=$1 AND date > now()-interval '14 days'
			 ORDER BY date DESC`, m.UserID)
		for recent.Next() {
			var d time.Time
			if err := recent.Scan(&d); err == nil {
				m.RecentDays = append(m.RecentDays, d.Format("2006-01-02"))
			}
		}
		recent.Close()
		if m.RecentDays == nil {
			m.RecentDays = []string{}
		}

		members = append(members, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"duo_streak":       duoStreak,
		"both_logged_today": bothLoggedToday,
		"members":          members,
	})
}

// calcIndividualStreak counts consecutive logged days ending today or yesterday.
func calcIndividualStreak(dates []string, today string) int {
	present := make(map[string]bool, len(dates))
	for _, d := range dates {
		present[d] = true
	}
	todayT, _ := time.Parse("2006-01-02", today)
	streak := 0
	for i := 0; i <= 400; i++ {
		day := todayT.AddDate(0, 0, -i).Format("2006-01-02")
		if present[day] {
			streak++
		} else if i > 0 {
			break
		}
	}
	return streak
}
