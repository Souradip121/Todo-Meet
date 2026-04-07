package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souradip121/showup-api/internal/email"
)

// CheckDuoStreaks runs nightly. For each active duo, checks if both members
// logged any commitment yesterday. If one (or both) missed, sends email to both.
// Uses duo_notifications table to dedup — one email per duo per missed date.
func CheckDuoStreaks(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client) error {
	yesterday := time.Now().UTC().AddDate(0, 0, -1)
	yesterdayStr := yesterday.Format("2006-01-02")
	yesterdayLabel := yesterday.Format("Monday, January 2")

	// Fetch all active duos with both members' info
	// m1.user_id < m2.user_id ensures one row per pair
	rows, err := db.Query(ctx, `
		SELECT g.id, g.title,
		       m1.user_id, u1.email, u1.display_name,
		       m2.user_id, u2.email, u2.display_name
		FROM groups g
		JOIN group_members m1 ON m1.group_id = g.id
		JOIN users u1 ON u1.id = m1.user_id
		JOIN group_members m2 ON m2.group_id = g.id
		JOIN users u2 ON u2.id = m2.user_id
		WHERE g.type = 'duo' AND g.status = 'active'
		  AND m1.user_id < m2.user_id
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type duoRow struct {
		GroupID, Title                                     string
		User1ID, User1Email, User1Name                     string
		User2ID, User2Email, User2Name                     string
	}
	var duos []duoRow
	for rows.Next() {
		var d duoRow
		if err := rows.Scan(
			&d.GroupID, &d.Title,
			&d.User1ID, &d.User1Email, &d.User1Name,
			&d.User2ID, &d.User2Email, &d.User2Name,
		); err == nil {
			duos = append(duos, d)
		}
	}
	rows.Close()

	for _, d := range duos {
		// Check who logged yesterday
		u1Logged := didLog(ctx, db, d.User1ID, yesterdayStr)
		u2Logged := didLog(ctx, db, d.User2ID, yesterdayStr)

		if u1Logged && u2Logged {
			continue // both showed up, no notification needed
		}

		// Dedup: only notify once per duo per missed date
		res, err := db.Exec(ctx,
			`INSERT INTO duo_notifications (group_id, date) VALUES ($1, $2)
			 ON CONFLICT (group_id, date) DO NOTHING`,
			d.GroupID, yesterdayStr,
		)
		if err != nil || res.RowsAffected() == 0 {
			continue // already notified
		}

		// Compute duo streak for the email
		streak := computeDuoStreak(ctx, db, d.GroupID, yesterdayStr)

		// Determine who missed
		missedName := ""
		switch {
		case !u1Logged && !u2Logged:
			missedName = "Neither of you"
		case !u1Logged:
			missedName = d.User1Name
		default:
			missedName = d.User2Name
		}

		// Send to both members
		for _, member := range []struct{ email, name string }{
			{d.User1Email, d.User1Name},
			{d.User2Email, d.User2Name},
		} {
			subj, html := email.DuoMissedEmail(email.DuoMissedParams{
				ToEmail:       member.email,
				ToName:        member.name,
				MissedPartner: missedName,
				DuoTitle:      d.Title,
				MissedDate:    yesterdayLabel,
				DuoStreak:     streak,
				GroupID:       d.GroupID,
			})
			if err := emailClient.Send(ctx, member.email, subj, html); err != nil {
				slog.Error("duo notification send failed", "group_id", d.GroupID, "to", member.email, "error", err)
			}
		}

		slog.Info("duo notification sent", "group_id", d.GroupID, "missed", missedName, "date", yesterdayStr)
	}
	return nil
}

func didLog(ctx context.Context, db *pgxpool.Pool, userID, date string) bool {
	var exists bool
	db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM commitment_logs WHERE user_id=$1 AND date=$2)`,
		userID, date,
	).Scan(&exists)
	return exists
}

func computeDuoStreak(ctx context.Context, db *pgxpool.Pool, groupID, asOfDate string) int {
	var streak int
	db.QueryRow(ctx, `
		WITH both_logged AS (
		  SELECT cl.date
		  FROM commitment_logs cl
		  WHERE cl.user_id IN (SELECT user_id FROM group_members WHERE group_id=$1)
		    AND cl.date <= $2
		  GROUP BY cl.date
		  HAVING COUNT(DISTINCT cl.user_id) = 2
		),
		numbered AS (
		  SELECT date,
		         (date - (ROW_NUMBER() OVER (ORDER BY date))::int) AS grp
		  FROM both_logged
		)
		SELECT COALESCE(COUNT(*), 0) FROM numbered
		WHERE grp = (SELECT grp FROM numbered ORDER BY date DESC LIMIT 1)
	`, groupID, asOfDate).Scan(&streak)
	return streak
}
