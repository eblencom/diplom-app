CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  login VARCHAR(32) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'analyst')),
  tg_username VARCHAR(255) NOT NULL DEFAULT ''
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
