-- name: UpsertDailyScore :one
INSERT INTO daily_scores (user_id, date, score, breakdown)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, date)
DO UPDATE SET score = EXCLUDED.score, breakdown = EXCLUDED.breakdown
RETURNING *;

-- name: GetDailyScoreByDate :one
SELECT * FROM daily_scores
WHERE user_id = $1 AND date = $2
LIMIT 1;

-- name: GetDailyScoresByUserYear :many
SELECT date, score, breakdown FROM daily_scores
WHERE user_id = $1
  AND date > now() - interval '1 year'
ORDER BY date;

-- name: GetWeeklyScores :many
SELECT date, score, breakdown FROM daily_scores
WHERE user_id = $1
  AND date >= CURRENT_DATE - interval '7 days'
ORDER BY date;
