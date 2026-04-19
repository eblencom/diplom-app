-- Курсор времени последней рассылки новостей в Telegram (бот раз в 10 мин).
-- psql -U ... -d ... -f db/migration_tg_news_digest_cursor.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS tg_news_last_digest_at TIMESTAMP NULL;
