-- +goose Up
ALTER TABLE groups ADD COLUMN type TEXT NOT NULL DEFAULT 'group'
  CHECK (type IN ('group', 'duo'));

CREATE TABLE duo_notifications (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, date)
);
CREATE INDEX dn_group_date ON duo_notifications(group_id, date);

-- +goose Down
DROP TABLE IF EXISTS duo_notifications;
ALTER TABLE groups DROP COLUMN IF EXISTS type;
