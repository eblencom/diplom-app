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
