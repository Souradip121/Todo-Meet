-- +goose Up
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
