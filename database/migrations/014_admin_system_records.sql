ALTER TABLE users
  ADD COLUMN status ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER role,
  ADD INDEX idx_users_status (status);

CREATE TABLE admin_system_records (
  id CHAR(36) PRIMARY KEY,
  level ENUM('info', 'warn', 'error') NOT NULL,
  event VARCHAR(160) NOT NULL,
  metadata_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_admin_system_records_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
