CREATE INDEX IF NOT EXISTS idx_news_datetime
ON news (datetime DESC);

CREATE INDEX IF NOT EXISTS idx_predicts_news_user
ON predicts (news_id, user_id);

CREATE INDEX IF NOT EXISTS idx_predicts_closed_lag_profit
ON predicts (lag_minutes, profit)
WHERE status = 'closed' AND profit IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_predicts_expect_prices
ON predicts (id)
WHERE status = 'expect' AND price_before IS NOT NULL AND price_after IS NOT NULL;
