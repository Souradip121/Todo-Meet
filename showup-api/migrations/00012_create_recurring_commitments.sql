-- +goose Up
CREATE TABLE recurring_commitments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  emoji            TEXT NOT NULL DEFAULT '⚡',
  color            TEXT NOT NULL DEFAULT 'green'
                   CHECK (color IN ('green', 'indigo', 'amber')),
  description      TEXT,
  target_min_day   INT,
  period_days      INT NOT NULL DEFAULT 30,
  start_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date         DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'archived', 'pending_review')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rc_user_idx ON recurring_commitments(user_id);

CREATE TABLE commitment_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id    UUID NOT NULL REFERENCES recurring_commitments(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  time_start       TIME,
  time_end         TIME,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (commitment_id, date)
);
CREATE INDEX cl_commitment_date ON commitment_logs(commitment_id, date);
CREATE INDEX cl_user_date ON commitment_logs(user_id, date);

-- +goose Down
DROP TABLE IF EXISTS commitment_logs;
DROP TABLE IF EXISTS recurring_commitments;
