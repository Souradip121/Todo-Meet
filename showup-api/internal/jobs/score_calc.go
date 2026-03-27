package jobs

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ScoreBreakdown struct {
	Declaration  int `json:"declaration"`
	Completion   int `json:"completion"`
	Debrief      int `json:"debrief"`
	GroupContrib int `json:"group_contrib"`
}

// CalcDailyScores computes and upserts integrity scores for all users.
// Called by the cron scheduler at midnight per user timezone.
func CalcDailyScores(ctx context.Context, db *pgxpool.Pool) error {
	start := time.Now()

	// Get all users with their timezones
	rows, err := db.Query(ctx, `SELECT id, timezone FROM users`)
	if err != nil {
		return err
	}
	type userRow struct{ id, tz string }
	var users []userRow
	for rows.Next() {
		var u userRow
		if err := rows.Scan(&u.id, &u.tz); err == nil {
			users = append(users, u)
		}
	}
	rows.Close()

	// Process in batches of 100 with max 10 concurrent goroutines
	sem := make(chan struct{}, 10)
	var wg sync.WaitGroup
	var mu sync.Mutex
	rowsAffected := 0

	for i := 0; i < len(users); i += 100 {
		end := i + 100
		if end > len(users) {
			end = len(users)
		}
		batch := users[i:end]

		sem <- struct{}{}
		wg.Add(1)
		go func(batch []userRow) {
			defer wg.Done()
			defer func() { <-sem }()

			for _, u := range batch {
				loc, err := time.LoadLocation(u.tz)
				if err != nil {
					loc = time.UTC
				}
				now := time.Now().In(loc)
				today := now.Format("2006-01-02")

				score, breakdown := calcScore(ctx, db, u.id, today)
				breakdownJSON, _ := json.Marshal(breakdown)

				_, err = db.Exec(ctx,
					`INSERT INTO daily_scores (user_id, date, score, breakdown)
					 VALUES ($1, $2, $3, $4)
					 ON CONFLICT (user_id, date) DO UPDATE
					   SET score=EXCLUDED.score, breakdown=EXCLUDED.breakdown`,
					u.id, today, score, string(breakdownJSON),
				)
				if err != nil {
					slog.Error("upsert daily score", "user_id", u.id, "error", err)
				} else {
					mu.Lock()
					rowsAffected++
					mu.Unlock()
				}
			}
		}(batch)
	}
	wg.Wait()

	durationMs := time.Since(start).Milliseconds()
	db.Exec(ctx,
		`INSERT INTO job_runs (job_name, status, duration_ms, rows_affected)
		 VALUES ('score_calc', 'success', $1, $2)`,
		durationMs, rowsAffected,
	)
	slog.Info("score_calc complete", "users", rowsAffected, "duration_ms", durationMs)

	// Restore 1 streak freeze at the start of each month for users who have none
	// and haven't used a freeze this calendar month.
	db.Exec(ctx,
		`UPDATE users
		 SET streak_freezes_remaining = 1
		 WHERE streak_freezes_remaining = 0
		   AND NOT EXISTS (
		     SELECT 1 FROM streak_freeze_uses
		     WHERE user_id = users.id
		       AND date >= date_trunc('month', now())
		   )`,
	)

	return nil
}

// UpsertTodayScore immediately recalculates and persists today's score for a single user.
// Call this after any action that changes score components (commitment complete, debrief submit).
func UpsertTodayScore(ctx context.Context, db *pgxpool.Pool, userID string) {
	var tz string
	if err := db.QueryRow(ctx, `SELECT timezone FROM users WHERE id=$1`, userID).Scan(&tz); err != nil {
		tz = "UTC"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}
	today := time.Now().In(loc).Format("2006-01-02")
	score, breakdown := calcScore(ctx, db, userID, today)
	breakdownJSON, _ := json.Marshal(breakdown)
	db.Exec(ctx,
		`INSERT INTO daily_scores (user_id, date, score, breakdown)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id, date) DO UPDATE
		   SET score=EXCLUDED.score, breakdown=EXCLUDED.breakdown`,
		userID, today, score, string(breakdownJSON),
	)
}

// calcScore computes the 0-5 integrity score for one user on a given date.
// Score = round((commitments_logged_today / total_active_commitments) * 5)
func calcScore(ctx context.Context, db *pgxpool.Pool, userID, date string) (int, ScoreBreakdown) {
	var bd ScoreBreakdown

	// Count active recurring commitments for this user
	var totalActive int
	db.QueryRow(ctx,
		`SELECT COUNT(*) FROM recurring_commitments
		 WHERE user_id=$1 AND status='active' AND start_date <= $2`,
		userID, date,
	).Scan(&totalActive)

	if totalActive == 0 {
		return 0, bd
	}

	// Count how many were logged on this date
	var loggedCount int
	db.QueryRow(ctx,
		`SELECT COUNT(DISTINCT cl.commitment_id)
		 FROM commitment_logs cl
		 JOIN recurring_commitments rc ON rc.id=cl.commitment_id
		 WHERE cl.user_id=$1 AND cl.date=$2 AND rc.status='active'`,
		userID, date,
	).Scan(&loggedCount)

	// score = round(logged/total * 5), min 1 if any logged
	var score int
	if loggedCount > 0 {
		raw := float64(loggedCount) / float64(totalActive) * 5
		score = int(raw + 0.5) // round
		if score < 1 {
			score = 1
		}
		if score > 5 {
			score = 5
		}
	}

	bd.Completion = score
	return score, bd
}
