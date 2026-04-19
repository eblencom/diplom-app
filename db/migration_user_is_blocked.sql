-- Блокировка входа для пользователей (аналитиков). Админов нельзя блокировать через API.
-- psql: \i db/migration_user_is_blocked.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users (is_blocked) WHERE is_blocked = true;
