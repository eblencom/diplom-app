-- Объединение user_ticker_alerts + user_favorite_news_* в user_preference_items,
-- категории компаний в companies.category_slugs (массив slug'ов).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS category_slugs TEXT[] NOT NULL DEFAULT '{}'::text[];

UPDATE companies SET category_slugs = ARRAY['energy','gas']::text[] WHERE ticker = 'GAZP';
UPDATE companies SET category_slugs = ARRAY['energy','oil']::text[] WHERE ticker IN ('ROSN', 'LKOH');
UPDATE companies SET category_slugs = ARRAY['finance']::text[] WHERE ticker IN ('SBER', 'VTBR');
UPDATE companies SET category_slugs = ARRAY['metals']::text[] WHERE ticker IN ('ALRS', 'GMKN', 'RUAL', 'NLMK', 'CHMF', 'MAGN');
UPDATE companies SET category_slugs = ARRAY['retail']::text[] WHERE ticker IN ('MTSS', 'MGNT');
UPDATE companies SET category_slugs = ARRAY['chemistry']::text[] WHERE ticker IN ('PHOR', 'AKRN');

CREATE TABLE IF NOT EXISTS user_preference_items (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(32) NOT NULL
    CHECK (kind IN ('ticker_alert', 'news_fav_company', 'news_fav_category')),
  company_id BIGINT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_slug VARCHAR(32) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_preference_items_shape CHECK (
    (kind IN ('ticker_alert', 'news_fav_company') AND company_id IS NOT NULL AND category_slug IS NULL)
    OR (kind = 'news_fav_category' AND category_slug IS NOT NULL AND company_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS u_pref_user_kind_company
ON user_preference_items (user_id, kind, company_id)
WHERE company_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS u_pref_user_kind_category_slug
ON user_preference_items (user_id, kind, category_slug)
WHERE kind = 'news_fav_category';

CREATE INDEX IF NOT EXISTS idx_user_preference_items_user
ON user_preference_items (user_id);

INSERT INTO user_preference_items (user_id, kind, company_id, category_slug, created_at)
SELECT user_id, 'ticker_alert', company_id, NULL, created_at
FROM user_ticker_alerts;

INSERT INTO user_preference_items (user_id, kind, company_id, category_slug, created_at)
SELECT user_id, 'news_fav_company', company_id, NULL, created_at
FROM user_favorite_news_companies;

INSERT INTO user_preference_items (user_id, kind, company_id, category_slug, created_at)
SELECT user_id, 'news_fav_category', NULL, category_slug, created_at
FROM user_favorite_news_categories;

DROP TABLE IF EXISTS user_ticker_alerts;
DROP TABLE IF EXISTS user_favorite_news_companies;
DROP TABLE IF EXISTS user_favorite_news_categories;
