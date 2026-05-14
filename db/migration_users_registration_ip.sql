-- IP регистрации: не более 3 учётных записей с одного адреса
ALTER TABLE users ADD COLUMN IF NOT EXISTS ip VARCHAR(64) NULL;

CREATE INDEX IF NOT EXISTS idx_users_registration_ip ON users (ip) WHERE ip IS NOT NULL;
