-- +goose Up
CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id      UUID NOT NULL REFERENCES users(id),
  group_id     UUID REFERENCES groups(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  duration_min INT  NOT NULL DEFAULT 25,
  status       TEXT NOT NULL DEFAULT 'waiting',
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_group_id_idx ON sessions(group_id);

CREATE TABLE session_members (
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  update_text TEXT,
  PRIMARY KEY (session_id, user_id)
);

-- +goose Down
DROP TABLE IF EXISTS session_members;
DROP TABLE IF EXISTS sessions;
