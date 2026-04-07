-- +goose Up
CREATE TABLE friendships (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
CREATE INDEX friendships_friend_idx ON friendships(friend_id);
CREATE INDEX friendships_accepted_idx ON friendships(user_id, status) WHERE status = 'accepted';

-- +goose Down
DROP TABLE IF EXISTS friendships;
