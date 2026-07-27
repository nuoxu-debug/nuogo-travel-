USE nuogo;

ALTER TABLE trips
  ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS trip_members (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('owner', 'editor', 'viewer') NOT NULL,
  status ENUM('active', 'removed') NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_trip_members_trip_user (trip_id, user_id),
  KEY idx_trip_members_trip_status (trip_id, status),
  KEY idx_trip_members_user_status (user_id, status),
  CONSTRAINT fk_trip_members_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO trip_members (id, trip_id, user_id, role, status)
SELECT UUID(), trips.id, trips.user_id, 'owner', 'active'
FROM trips
LEFT JOIN trip_members
  ON trip_members.trip_id = trips.id
 AND trip_members.user_id = trips.user_id
WHERE trip_members.id IS NULL;

CREATE TABLE IF NOT EXISTS trip_invitations (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  role ENUM('editor', 'viewer') NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'revoked', 'expired') NOT NULL DEFAULT 'pending',
  invited_by_user_id VARCHAR(36) NOT NULL,
  accepted_by_user_id VARCHAR(36) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  UNIQUE KEY uq_trip_invitations_token_hash (token_hash),
  KEY idx_trip_invitations_trip_status (trip_id, status),
  KEY idx_trip_invitations_expiry (expires_at, status),
  CONSTRAINT fk_trip_invitations_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_invitations_invited_by FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_invitations_accepted_by FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS trip_expenses (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(36) NOT NULL,
  description VARCHAR(120) NOT NULL,
  category ENUM('accommodation', 'transportation', 'food', 'attractions', 'entertainment', 'other') NOT NULL,
  amount_fen INT UNSIGNED NOT NULL,
  expense_date DATE NOT NULL,
  paid_by_user_id VARCHAR(36) NOT NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_trip_expenses_trip_date (trip_id, expense_date),
  KEY idx_trip_expenses_payer (paid_by_user_id),
  CONSTRAINT fk_trip_expenses_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_expenses_payer FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_trip_expenses_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS expense_participants (
  expense_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  share_fen INT UNSIGNED NOT NULL,
  PRIMARY KEY (expense_id, user_id),
  KEY idx_expense_participants_user (user_id),
  CONSTRAINT fk_expense_participants_expense FOREIGN KEY (expense_id) REFERENCES trip_expenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_expense_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS trip_activity_log (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(36) NOT NULL,
  actor_user_id VARCHAR(36) NOT NULL,
  action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  summary_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_trip_activity_log_trip_created (trip_id, created_at),
  KEY idx_trip_activity_log_entity (entity_type, entity_id),
  CONSTRAINT fk_trip_activity_log_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_activity_log_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
