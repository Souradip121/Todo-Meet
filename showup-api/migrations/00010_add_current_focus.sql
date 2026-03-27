-- +goose Up
ALTER TABLE users ADD COLUMN current_focus TEXT;

-- +goose Down
ALTER TABLE users DROP COLUMN current_focus;
