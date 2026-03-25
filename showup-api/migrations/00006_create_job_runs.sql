-- +goose Up
CREATE TABLE job_runs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name      TEXT NOT NULL,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    status        TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'success', 'error')),
    duration_ms   INT,
    rows_affected INT,
    error_msg     TEXT
);

CREATE INDEX idx_job_runs_name_started ON job_runs(job_name, started_at DESC);

-- +goose Down
DROP TABLE IF EXISTS job_runs;
