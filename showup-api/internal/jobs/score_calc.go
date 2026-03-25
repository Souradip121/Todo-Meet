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
	return nil
}

// calcScore computes the 0-5 integrity score for one user on a given date.
func calcScore(ctx context.Context, db *pgxpool.Pool, userID, date string) (int, ScoreBreakdown) {
	var bd ScoreBreakdown

	// +1 declaration submitted?
	var declCount int
	db.QueryRow(ctx, `SELECT COUNT(*) FROM declarations WHERE user_id=$1 AND date=$2`, userID, date).Scan(&declCount)
	if declCount > 0 {
		bd.Declaration = 1
	}

	// +2 completion: ≥50% of commitments completed
	// non_negotiable completions count double
	rows, _ := db.Query(ctx,
		`SELECT intensity, status FROM commitments WHERE user_id=$1 AND created_at::date=$2`,
		userID, date,
	)
	total, completed := 0, 0
	for rows.Next() {
		var intensity, status string
		rows.Scan(&intensity, &status)
		weight := 1
		if intensity == "non_negotiable" {
			weight = 2
		}
		total += weight
		if status == "completed" {
			completed += weight
		}
	}
	rows.Close()
	if total > 0 && completed*2 >= total { // ≥50%
		bd.Completion = 2
	}

	// +1 debrief submitted?
	var debriefCount int
	db.QueryRow(ctx, `SELECT COUNT(*) FROM eod_debriefs WHERE user_id=$1 AND date=$2`, userID, date).Scan(&debriefCount)
	if debriefCount > 0 {
		bd.Debrief = 1
	}

	// +1 group contrib (Phase 2 — always 0 for now)
	bd.GroupContrib = 0

	score := bd.Declaration + bd.Completion + bd.Debrief + bd.GroupContrib
	if score > 5 {
		score = 5
	}
	return score, bd
}
