CREATE TABLE IF NOT EXISTS users (
  -- baza userov, nichego slozhnogo
  id BIGSERIAL PRIMARY KEY,
  login VARCHAR(32) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'analyst')),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  ip VARCHAR(64) NULL,
  tg_username VARCHAR(255) NOT NULL DEFAULT '',
  tg_chat_id BIGINT NULL,
  tg_price_last_digest_at TIMESTAMP NULL,
  tg_news_last_digest_at TIMESTAMP NULL,
  tg_news_interval_minutes INT NOT NULL DEFAULT 10
    CHECK (tg_news_interval_minutes >= 1 AND tg_news_interval_minutes <= 1440)
);

CREATE TABLE IF NOT EXISTS companies (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ticker VARCHAR(32) NOT NULL UNIQUE,
  news_link TEXT,
  price_link TEXT,
  prices_path TEXT
);

CREATE TABLE IF NOT EXISTS news (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  datetime TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_news_company_datetime
ON news (company_id, datetime DESC);

CREATE INDEX IF NOT EXISTS idx_news_datetime
ON news (datetime DESC);

CREATE TABLE IF NOT EXISTS predicts (
  -- predikty po novostyam i ih iskhod
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id BIGINT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  prediction VARCHAR(20) NOT NULL DEFAULT 'positive'
    CHECK (prediction IN ('positive', 'neutral', 'negative')),
  result VARCHAR(20) NULL
    CHECK (result IS NULL OR result IN ('win', 'neutral', 'lose')),
  result_percent NUMERIC(14, 6) NULL,
  profit NUMERIC(14, 6) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'expect'
    CHECK (status IN ('expect', 'closed')),
  lag_minutes INT NOT NULL DEFAULT 60
    CHECK (lag_minutes >= 1 AND lag_minutes <= 1440),
  price_before NUMERIC(14, 6) NULL,
  price_after NUMERIC(14, 6) NULL
);

CREATE INDEX IF NOT EXISTS idx_predicts_user_news
ON predicts (user_id, news_id);

CREATE INDEX IF NOT EXISTS idx_predicts_status
ON predicts (status);

CREATE INDEX IF NOT EXISTS idx_predicts_news_user
ON predicts (news_id, user_id);

CREATE INDEX IF NOT EXISTS idx_predicts_closed_lag_profit
ON predicts (lag_minutes, profit)
WHERE status = 'closed' AND profit IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_predicts_expect_prices
ON predicts (id)
WHERE status = 'expect' AND price_before IS NOT NULL AND price_after IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_ticker_alerts (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ticker_alerts_user
ON user_ticker_alerts (user_id);

CREATE TABLE IF NOT EXISTS user_favorite_news_companies (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_fav_news_companies_user
ON user_favorite_news_companies (user_id);

CREATE TABLE IF NOT EXISTS user_favorite_news_categories (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_slug VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, category_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_fav_news_categories_user
ON user_favorite_news_categories (user_id);
