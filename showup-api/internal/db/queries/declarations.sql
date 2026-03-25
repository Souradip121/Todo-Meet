-- name: CreateDeclaration :one
INSERT INTO declarations (user_id, date)
VALUES ($1, $2)
RETURNING *;

-- name: GetDeclarationByUserAndDate :one
SELECT * FROM declarations
WHERE user_id = $1 AND date = $2
LIMIT 1;

-- name: GetDeclarationWithCommitments :one
SELECT * FROM declarations
WHERE user_id = $1 AND date = $2
LIMIT 1;

-- name: ListDeclarationsByUser :many
SELECT * FROM declarations
WHERE user_id = $1
ORDER BY date DESC
LIMIT $2 OFFSET $3;

-- name: CountDeclarationsByUser :one
SELECT COUNT(*) FROM declarations WHERE user_id = $1;
