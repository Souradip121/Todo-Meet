-- +goose Up
CREATE TABLE streak_freeze_uses (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date     DATE NOT NULL,
  used_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- +goose Down
DROP TABLE IF EXISTS streak_freeze_uses;
