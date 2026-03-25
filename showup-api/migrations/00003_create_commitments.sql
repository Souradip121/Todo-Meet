-- +goose Up
CREATE TABLE commitments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('personal', 'group')),
    intensity      TEXT NOT NULL CHECK (intensity IN ('soft', 'firm', 'non_negotiable')),
    tag            TEXT CHECK (tag IN ('work', 'learning', 'health', 'relationships', 'other')),
    group_id       UUID,
    status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'completed', 'carried', 'dropped')),
    slip_count     SMALLINT NOT NULL DEFAULT 0,
    honest_score   SMALLINT CHECK (honest_score BETWEEN 1 AND 3),
    focus_time_sec INT NOT NULL DEFAULT 0,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commitments_user_date ON commitments(user_id, (created_at::date));
CREATE INDEX idx_commitments_tag       ON commitments(user_id, tag);

-- +goose Down
DROP TABLE IF EXISTS commitments;
