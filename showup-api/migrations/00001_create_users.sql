-- +goose Up
CREATE TABLE users (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                    TEXT UNIQUE NOT NULL,
    username                 TEXT UNIQUE NOT NULL,
    display_name             TEXT NOT NULL,
    avatar_url               TEXT,
    timezone                 TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    persona_level            SMALLINT NOT NULL DEFAULT 0,
    streak_freezes_remaining SMALLINT NOT NULL DEFAULT 1,
    availability_config      JSONB,
    availability_mood        TEXT,
    onboarding_complete      BOOLEAN NOT NULL DEFAULT false,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- +goose Down
DROP TABLE IF EXISTS users;
