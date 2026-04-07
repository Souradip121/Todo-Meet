package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/robfig/cron/v3"

	"github.com/Souradip121/showup-api/internal/email"
)

// Scheduler wraps robfig/cron for all background jobs.
type Scheduler struct {
	c     *cron.Cron
	db    *pgxpool.Pool
	email *email.Client
}

func NewScheduler(db *pgxpool.Pool, emailClient *email.Client) *Scheduler {
	c := cron.New(cron.WithSeconds(), cron.WithLocation(time.UTC))
	return &Scheduler{c: c, db: db, email: emailClient}
}

// Start registers all jobs and starts the cron runner.
func (s *Scheduler) Start() {
	// 00:05 UTC — daily score calculation
	s.c.AddFunc("0 5 0 * * *", func() {
		slog.Info("job starting", "name", "score_calc")
		if err := CalcDailyScores(context.Background(), s.db); err != nil {
			slog.Error("job error", "name", "score_calc", "error", err)
		}
	})

	// 00:10 UTC — duo streak notifications (after score_calc writes)
	s.c.AddFunc("0 10 0 * * *", func() {
		slog.Info("job starting", "name", "duo_notifications")
		if err := CheckDuoStreaks(context.Background(), s.db, s.email); err != nil {
			slog.Error("job error", "name", "duo_notifications", "error", err)
		}
	})

	// 00:15 UTC — reset challenge streaks for participants who missed yesterday
	s.c.AddFunc("0 15 0 * * *", func() {
		slog.Info("job starting", "name", "challenge_streak_reset")
		if err := ResetChallengeStreaks(context.Background(), s.db); err != nil {
			slog.Error("job error", "name", "challenge_streak_reset", "error", err)
		}
	})

	s.c.Start()
	slog.Info("cron scheduler started")
}

func (s *Scheduler) Stop() {
	s.c.Stop()
}
