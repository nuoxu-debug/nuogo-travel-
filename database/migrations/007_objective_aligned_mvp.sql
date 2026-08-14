ALTER TABLE users
  ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user';

CREATE TABLE supported_destinations (
  id VARCHAR(40) PRIMARY KEY,
  name_en VARCHAR(120) NOT NULL,
  name_zh VARCHAR(120) NOT NULL,
  center_latitude DECIMAL(10, 7) NOT NULL,
  center_longitude DECIMAL(10, 7) NOT NULL,
  status ENUM('ACTIVE', 'OUTDATED', 'UNAVAILABLE') NOT NULL DEFAULT 'ACTIVE',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE canonical_pois (
  id VARCHAR(80) PRIMARY KEY,
  destination_id VARCHAR(40) NOT NULL,
  name_json JSON NOT NULL,
  category VARCHAR(40) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  address_json JSON NULL,
  status ENUM('ACTIVE', 'OUTDATED', 'UNAVAILABLE') NOT NULL DEFAULT 'ACTIVE',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_canonical_pois_destination (destination_id, status),
  CONSTRAINT fk_canonical_pois_destination FOREIGN KEY (destination_id)
    REFERENCES supported_destinations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE poi_source_records (
  id VARCHAR(120) PRIMARY KEY,
  poi_id VARCHAR(80) NOT NULL,
  provider VARCHAR(40) NOT NULL,
  source_id VARCHAR(160) NOT NULL,
  source_url VARCHAR(2048) NULL,
  retrieved_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NULL,
  raw_json JSON NULL,
  UNIQUE KEY uq_poi_source (poi_id, provider, source_id),
  CONSTRAINT fk_poi_sources_canonical FOREIGN KEY (poi_id)
    REFERENCES canonical_pois(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE route_cache (
  cache_key CHAR(64) PRIMARY KEY,
  mode VARCHAR(30) NOT NULL,
  distance_meters INT UNSIGNED NOT NULL,
  duration_seconds INT UNSIGNED NOT NULL,
  route_json JSON NOT NULL,
  provider VARCHAR(40) NOT NULL,
  source_id VARCHAR(160) NOT NULL,
  retrieved_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NULL,
  KEY idx_route_cache_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cost_references (
  id VARCHAR(80) PRIMARY KEY,
  destination_id VARCHAR(40) NOT NULL,
  category VARCHAR(40) NOT NULL,
  unit VARCHAR(40) NOT NULL,
  amount_fen BIGINT UNSIGNED NOT NULL,
  source_json JSON NULL,
  effective_from DATE NULL,
  effective_to DATE NULL,
  status ENUM('ACTIVE', 'OUTDATED', 'UNAVAILABLE') NOT NULL DEFAULT 'ACTIVE',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cost_reference_lookup (destination_id, category, status),
  CONSTRAINT fk_cost_reference_destination FOREIGN KEY (destination_id)
    REFERENCES supported_destinations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE itinerary_runs (
  id VARCHAR(80) PRIMARY KEY,
  trip_id VARCHAR(36) NOT NULL,
  profile ENUM('BUDGET_SAVING', 'BALANCED', 'COMFORT_FOCUSED') NOT NULL,
  state ENUM('DRAFT', 'VALIDATING', 'REPAIRING', 'FINAL_VALIDATED', 'FAILED') NOT NULL,
  estimated_total_fen BIGINT UNSIGNED NULL,
  summary_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_itinerary_runs_trip (trip_id, profile),
  CONSTRAINT fk_itinerary_runs_trip FOREIGN KEY (trip_id)
    REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE trip_legs (
  id VARCHAR(100) PRIMARY KEY,
  itinerary_run_id VARCHAR(80) NOT NULL,
  day_number TINYINT UNSIGNED NOT NULL,
  sequence SMALLINT UNSIGNED NOT NULL,
  leg_json JSON NOT NULL,
  UNIQUE KEY uq_trip_leg_sequence (itinerary_run_id, day_number, sequence),
  CONSTRAINT fk_trip_legs_run FOREIGN KEY (itinerary_run_id)
    REFERENCES itinerary_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE itinerary_provenance (
  id VARCHAR(100) PRIMARY KEY,
  itinerary_run_id VARCHAR(80) NOT NULL,
  path VARCHAR(255) NOT NULL,
  source_json JSON NOT NULL,
  CONSTRAINT fk_itinerary_provenance_run FOREIGN KEY (itinerary_run_id)
    REFERENCES itinerary_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE itinerary_validation_issues (
  id VARCHAR(100) PRIMARY KEY,
  itinerary_run_id VARCHAR(80) NOT NULL,
  code VARCHAR(80) NOT NULL,
  path VARCHAR(255) NOT NULL,
  severity ENUM('ERROR', 'WARNING') NOT NULL,
  metadata_json JSON NOT NULL,
  CONSTRAINT fk_itinerary_issues_run FOREIGN KEY (itinerary_run_id)
    REFERENCES itinerary_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE itinerary_repairs (
  id VARCHAR(100) PRIMARY KEY,
  itinerary_run_id VARCHAR(80) NOT NULL,
  attempt SMALLINT UNSIGNED NOT NULL,
  repair_json JSON NOT NULL,
  CONSTRAINT fk_itinerary_repairs_run FOREIGN KEY (itinerary_run_id)
    REFERENCES itinerary_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
