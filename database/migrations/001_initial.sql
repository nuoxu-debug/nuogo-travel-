CREATE DATABASE IF NOT EXISTS nuogo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE nuogo;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  status ENUM('draft', 'upcoming', 'completed') NOT NULL DEFAULT 'draft',
  title_en VARCHAR(255) NOT NULL,
  title_zh VARCHAR(255) NOT NULL,
  destination VARCHAR(40) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_budget DECIMAL(12, 2) NOT NULL,
  selected_variant_id VARCHAR(36) NULL,
  preferences_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_trips_user_updated (user_id, updated_at),
  CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS travel_preferences (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  trip_id VARCHAR(36) NOT NULL,
  destination VARCHAR(40) NOT NULL,
  departure_city VARCHAR(40) NOT NULL,
  days TINYINT UNSIGNED NOT NULL,
  total_budget DECIMAL(12, 2) NOT NULL,
  interests_json JSON NOT NULL,
  group_type VARCHAR(40) NOT NULL,
  accommodation VARCHAR(40) NOT NULL,
  language ENUM('en', 'zh') NOT NULL DEFAULT 'en',
  start_date DATE NOT NULL,
  conflicts_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_preferences_user (user_id),
  UNIQUE KEY uq_preferences_trip (trip_id),
  CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_preferences_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS itinerary_variants (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(36) NOT NULL,
  style ENUM('budget', 'food', 'leisure') NOT NULL,
  title_json JSON NOT NULL,
  summary_json JSON NOT NULL,
  pace VARCHAR(40) NOT NULL,
  highlights_json JSON NOT NULL,
  budget_json JSON NOT NULL,
  is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_variants_trip (trip_id),
  UNIQUE KEY uq_variants_trip_style (trip_id, style),
  CONSTRAINT fk_variants_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE trips
  ADD CONSTRAINT fk_trips_selected_variant
  FOREIGN KEY (selected_variant_id) REFERENCES itinerary_variants(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS trip_days (
  id VARCHAR(36) PRIMARY KEY,
  variant_id VARCHAR(36) NOT NULL,
  day_number TINYINT UNSIGNED NOT NULL,
  trip_date DATE NOT NULL,
  title_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_days_variant_number (variant_id, day_number),
  UNIQUE KEY uq_days_variant_number (variant_id, day_number),
  CONSTRAINT fk_days_variant FOREIGN KEY (variant_id) REFERENCES itinerary_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(36) PRIMARY KEY,
  day_id VARCHAR(36) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  name_json JSON NOT NULL,
  description_json JSON NOT NULL,
  category VARCHAR(50) NOT NULL,
  address_json JSON NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  estimated_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  transport_note_json JSON NOT NULL,
  guide_json JSON NOT NULL,
  vote_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_activities_day_order (day_id, sort_order),
  CONSTRAINT fk_activities_day FOREIGN KEY (day_id) REFERENCES trip_days(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS trip_shares (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(36) NOT NULL,
  token VARCHAR(64) NOT NULL,
  permission ENUM('view', 'edit') NOT NULL DEFAULT 'view',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_shares_trip (trip_id),
  UNIQUE KEY uq_shares_token (token),
  CONSTRAINT fk_shares_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS activity_votes (
  id VARCHAR(36) PRIMARY KEY,
  share_id VARCHAR(36) NOT NULL,
  activity_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_activity_votes_actor (share_id, activity_id, user_id),
  KEY idx_votes_activity (activity_id),
  KEY idx_votes_user (user_id),
  CONSTRAINT fk_votes_share FOREIGN KEY (share_id) REFERENCES trip_shares(id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  source_activity_id VARCHAR(36) NOT NULL,
  activity_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_favorites_user_activity (user_id, source_activity_id),
  KEY idx_favorites_created (user_id, created_at),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_activity FOREIGN KEY (source_activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
