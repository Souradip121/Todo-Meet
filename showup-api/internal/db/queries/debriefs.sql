-- name: CreateDebrief :one
INSERT INTO eod_debriefs (user_id, date, what_moved, what_didnt, mood, energy)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id, date) DO UPDATE
SET what_moved = EXCLUDED.what_moved,
    what_didnt = EXCLUDED.what_didnt,
    mood = EXCLUDED.mood,
    energy = EXCLUDED.energy,
    submitted_at = now()
RETURNING *;

-- name: GetDebriefByUserAndDate :one
SELECT * FROM eod_debriefs
WHERE user_id = $1 AND date = $2
LIMIT 1;

-- name: GetDebriefsByUser :many
SELECT * FROM eod_debriefs
WHERE user_id = $1
ORDER BY date DESC
LIMIT $2 OFFSET $3;

-- name: CountDebriefsByUser :one
SELECT COUNT(*) FROM eod_debriefs WHERE user_id = $1;

-- name: GetDebriefStreak :many
SELECT date FROM eod_debriefs
WHERE user_id = $1
ORDER BY date DESC
LIMIT 400;
