package jobs

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ResetChallengeStreaks zeroes current_streak for any participant who did not
// check in yesterday (i.e. last_checkin_date < CURRENT_DATE - 1).
func ResetChallengeStreaks(ctx context.Context, db *pgxpool.Pool) error {
	result, err := db.Exec(ctx,
		`UPDATE challenge_participants
		 SET current_streak = 0
		 WHERE last_checkin_date < CURRENT_DATE - 1
		   AND current_streak > 0`,
	)
	if err != nil {
		return err
	}
	slog.Info("challenge streak reset complete", "rows_reset", result.RowsAffected())
	return nil
}
