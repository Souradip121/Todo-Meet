-- +goose Up
ALTER TABLE users ADD COLUMN IF NOT EXISTS college_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS college_url;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
