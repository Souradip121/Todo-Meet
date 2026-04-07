-- +goose Up
ALTER TABLE commitment_logs ADD COLUMN photo_url TEXT;

-- +goose Down
ALTER TABLE commitment_logs DROP COLUMN IF EXISTS photo_url;
