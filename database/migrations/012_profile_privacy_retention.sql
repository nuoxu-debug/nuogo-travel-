ALTER TABLE users
  ADD COLUMN preferred_language ENUM('zh', 'en') NOT NULL DEFAULT 'zh' AFTER email,
  ADD COLUMN account_type ENUM('REGISTERED', 'GUEST') NOT NULL DEFAULT 'REGISTERED' AFTER preferred_language;

UPDATE users
SET account_type = 'GUEST'
WHERE BINARY name = 'Nuogo Guest'
  AND BINARY email REGEXP '^guest\\+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@nuogo\\.local$';
