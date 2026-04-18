-- Несколько предсказаний на новость, свой lag_minutes, цены на строке predicts.
-- Выполнить один раз на существующей БД (psql или клиент).

DROP INDEX IF EXISTS idx_predicts_user_news;

CREATE INDEX IF NOT EXISTS idx_predicts_user_news ON predicts (user_id, news_id);

ALTER TABLE predicts
  ADD COLUMN IF NOT EXISTS lag_minutes INT NOT NULL DEFAULT 60;

ALTER TABLE predicts
  ADD COLUMN IF NOT EXISTS price_before NUMERIC(14, 6) NULL;

ALTER TABLE predicts
  ADD COLUMN IF NOT EXISTS price_after NUMERIC(14, 6) NULL;

ALTER TABLE predicts DROP CONSTRAINT IF EXISTS predicts_lag_minutes_check;

ALTER TABLE predicts
  ADD CONSTRAINT predicts_lag_minutes_check
  CHECK (lag_minutes >= 1 AND lag_minutes <= 1440);
