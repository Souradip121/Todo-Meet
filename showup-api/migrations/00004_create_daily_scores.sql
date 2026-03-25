-- +goose Up
CREATE TABLE daily_scores (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date      DATE NOT NULL,
    score     SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 5),
    breakdown JSONB NOT NULL DEFAULT '{}',
    UNIQUE (user_id, date)
);

CREATE INDEX idx_daily_scores_user_year ON daily_scores(user_id, date DESC);

-- +goose Down
DROP TABLE IF EXISTS daily_scores;
