ALTER TABLE users ADD COLUMN IF NOT EXISTS tg_chat_id BIGINT NULL;

CREATE TABLE IF NOT EXISTS user_ticker_alerts (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ticker_alerts_user
  ON user_ticker_alerts (user_id);
