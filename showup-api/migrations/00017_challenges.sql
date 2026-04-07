-- +goose Up
CREATE TABLE challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  category        TEXT NOT NULL,
  duration_days   INT NOT NULL,
  check_in_rule   TEXT NOT NULL DEFAULT 'Check in once daily before midnight',
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming', 'active', 'ended')),
  is_official     BOOL NOT NULL DEFAULT TRUE,
  stakes_enabled  BOOL NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  rules           JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX challenges_status_idx ON challenges(status);

CREATE TABLE challenge_participants (
  challenge_id        UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_streak      INT NOT NULL DEFAULT 0,
  total_checkins      INT NOT NULL DEFAULT 0,
  last_checkin_date   DATE,
  stake_amount_paise  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (challenge_id, user_id)
);
CREATE INDEX cp_challenge_streak_idx ON challenge_participants(challenge_id, current_streak DESC, total_checkins DESC, joined_at ASC);

CREATE TABLE challenge_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  photo_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id, date)
);
CREATE INDEX cc_challenge_user_idx ON challenge_checkins(challenge_id, user_id);

-- Seed 3 official challenges
INSERT INTO challenges (title, category, duration_days, check_in_rule, start_date, end_date, status, is_official, stakes_enabled, rules)
VALUES
  (
    '30-Day Build Streak',
    'work',
    30,
    'Log at least 30 minutes of coding/building work',
    CURRENT_DATE,
    CURRENT_DATE + 29,
    'active',
    TRUE,
    TRUE,
    '["Log at least 30 minutes of active building each day", "Screenshot or commit proof counts as check-in", "Missing a day resets your personal streak to zero", "Top 3 at end get their stakes doubled from the forfeit pool"]'
  ),
  (
    'Daily Learning Sprint',
    'learning',
    21,
    'Study or learn something new for at least 20 minutes',
    CURRENT_DATE,
    CURRENT_DATE + 20,
    'active',
    TRUE,
    TRUE,
    '["Log at least 20 minutes of active learning", "Any medium counts — course, book, docs, video", "Skipping a day resets your streak", "Top 5 finishers split 20% of the forfeit pool"]'
  ),
  (
    'No Phone Before 9AM',
    'mindfulness',
    14,
    'No phone screen before 9AM — honour system + screen time screenshot',
    CURRENT_DATE + 2,
    CURRENT_DATE + 15,
    'upcoming',
    TRUE,
    FALSE,
    '["No phone screen usage before 9AM", "Partners in a duo can verify each other", "Challenge runs 14 consecutive days once started", "Anyone who completes earns the Stillness badge"]'
  );

-- +goose Down
DROP TABLE IF EXISTS challenge_checkins;
DROP TABLE IF EXISTS challenge_participants;
DROP TABLE IF EXISTS challenges;
