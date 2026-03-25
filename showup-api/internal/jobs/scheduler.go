package jobs

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/robfig/cron/v3"
)

// Scheduler wraps robfig/cron for all background jobs.
type Scheduler struct {
	c  *cron.Cron
	db *pgxpool.Pool
}

func NewScheduler(db *pgxpool.Pool) *Scheduler {
	c := cron.New(cron.WithSeconds(), cron.WithLocation(nil)) // UTC; per-user tz handled inside job
	return &Scheduler{c: c, db: db}
}

// Start registers all jobs and starts the cron runner.
func (s *Scheduler) Start() {
	// Midnight score calculation — runs at 00:05 UTC every day.
	// Offset to 00:05 so Neon has processed any late writes.
	s.c.AddFunc("0 5 0 * * *", func() {
		slog.Info("job starting", "name", "score_calc")
		if err := CalcDailyScores(context.Background(), s.db); err != nil {
			slog.Error("job error", "name", "score_calc", "error", err)
		}
	})

	s.c.Start()
	slog.Info("cron scheduler started")
}

func (s *Scheduler) Stop() {
	s.c.Stop()
}
