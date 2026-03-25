-- +goose Up
CREATE TABLE eod_debriefs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    what_moved   TEXT,
    what_didnt   TEXT,
    mood         SMALLINT CHECK (mood BETWEEN 1 AND 5),
    energy       SMALLINT CHECK (energy BETWEEN 1 AND 5),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);

CREATE INDEX idx_eod_debriefs_user_date ON eod_debriefs(user_id, date DESC);

-- +goose Down
DROP TABLE IF EXISTS eod_debriefs;
