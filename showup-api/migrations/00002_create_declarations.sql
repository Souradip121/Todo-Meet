-- +goose Up
CREATE TABLE declarations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);

CREATE INDEX idx_declarations_user_date ON declarations(user_id, date DESC);

-- +goose Down
DROP TABLE IF EXISTS declarations;
