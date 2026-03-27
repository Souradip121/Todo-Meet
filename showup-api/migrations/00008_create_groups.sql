-- +goose Up
CREATE TABLE groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  duration_days INT  NOT NULL DEFAULT 30,
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'active',
  invite_code   TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE nudges (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES users(id),
  to_user   UUID NOT NULL REFERENCES users(id),
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX nudges_to_user_sent_at_idx ON nudges(to_user, sent_at);

-- +goose Down
DROP TABLE IF EXISTS nudges;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
