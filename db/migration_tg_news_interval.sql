ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tg_price_last_digest_at TIMESTAMP NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tg_news_interval_minutes INT DEFAULT 10;

UPDATE users
SET tg_news_interval_minutes = 10
WHERE tg_news_interval_minutes IS NULL;

ALTER TABLE users
  ALTER COLUMN tg_news_interval_minutes SET DEFAULT 10;

ALTER TABLE users
  ALTER COLUMN tg_news_interval_minutes SET NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_tg_news_interval_minutes_check;

ALTER TABLE users
  ADD CONSTRAINT users_tg_news_interval_minutes_check
  CHECK (tg_news_interval_minutes >= 1 AND tg_news_interval_minutes <= 1440);
