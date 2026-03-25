-- name: CreateCommitment :one
INSERT INTO commitments (declaration_id, user_id, title, type, intensity, tag)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetCommitmentByID :one
SELECT * FROM commitments WHERE id = $1 LIMIT 1;

-- name: GetCommitmentsByDeclarationID :many
SELECT * FROM commitments
WHERE declaration_id = $1
ORDER BY created_at;

-- name: GetTodayCommitmentsByUser :many
SELECT * FROM commitments
WHERE user_id = $1
  AND created_at::date = CURRENT_DATE
ORDER BY created_at;

-- name: CountTodayCommitmentsByDeclaration :one
SELECT COUNT(*) FROM commitments WHERE declaration_id = $1;

-- name: CompleteCommitment :one
UPDATE commitments
SET status = 'completed',
    honest_score = $2,
    completed_at = now()
WHERE id = $1
RETURNING *;

-- name: CarryCommitment :one
UPDATE commitments
SET status = 'carried',
    slip_count = slip_count + 1
WHERE id = $1
RETURNING *;

-- name: DropCommitment :one
UPDATE commitments
SET status = 'dropped'
WHERE id = $1
RETURNING *;

-- name: AddFocusTime :one
UPDATE commitments
SET focus_time_sec = focus_time_sec + $2
WHERE id = $1
RETURNING *;

-- name: GetSlippingCommitments :many
SELECT * FROM commitments
WHERE user_id = $1
  AND slip_count >= 3
  AND status = 'pending'
ORDER BY slip_count DESC;

-- name: GetCommitmentsForScoring :many
SELECT * FROM commitments
WHERE user_id = $1
  AND created_at::date = $2;
