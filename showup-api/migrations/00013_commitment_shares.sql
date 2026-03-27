-- +goose Up
CREATE TABLE commitment_shares (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID NOT NULL REFERENCES recurring_commitments(id) ON DELETE CASCADE,
  token         TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 12),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cs_token_idx ON commitment_shares(token);

-- +goose Down
DROP TABLE IF EXISTS commitment_shares;
