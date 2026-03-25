-- name: CreateUser :one
INSERT INTO users (email, username, display_name, timezone)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = $1 LIMIT 1;

-- name: UpdateUserOnboarding :one
UPDATE users
SET onboarding_complete = true, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateUserTimezone :one
UPDATE users
SET timezone = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListAllUsersForScoring :many
SELECT id, timezone FROM users;
