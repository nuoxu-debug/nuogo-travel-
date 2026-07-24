USE nuogo;

CREATE TABLE IF NOT EXISTS ingestion_sources (
  id VARCHAR(36) PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  region_id VARCHAR(60) NOT NULL,
  source_url VARCHAR(1000) NOT NULL,
  source_type VARCHAR(60) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_fetched_at DATETIME NULL,
  last_status VARCHAR(30) NULL,
  etag VARCHAR(255) NULL,
  content_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ingestion_source_url (source_url(500)),
  KEY idx_ingestion_region (region_id, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id VARCHAR(36) PRIMARY KEY,
  source_id VARCHAR(36) NOT NULL,
  status ENUM('running', 'completed', 'failed') NOT NULL,
  started_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  items_found INT UNSIGNED NOT NULL DEFAULT 0,
  items_created INT UNSIGNED NOT NULL DEFAULT 0,
  items_updated INT UNSIGNED NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  KEY idx_scrape_jobs_source (source_id, started_at),
  CONSTRAINT fk_scrape_jobs_source FOREIGN KEY (source_id) REFERENCES ingestion_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS attractions (
  id VARCHAR(36) PRIMARY KEY,
  province VARCHAR(80) NOT NULL,
  region_id VARCHAR(60) NOT NULL,
  external_source VARCHAR(40) NOT NULL,
  external_id VARCHAR(100) NOT NULL,
  name_zh VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NULL,
  description_zh TEXT NULL,
  description_en TEXT NULL,
  location_label VARCHAR(500) NULL,
  address VARCHAR(500) NULL,
  longitude DECIMAL(10, 7) NULL,
  latitude DECIMAL(10, 7) NULL,
  ticket_price_min DECIMAL(10, 2) NULL,
  ticket_price_max DECIMAL(10, 2) NULL,
  opening_hours VARCHAR(500) NULL,
  category VARCHAR(60) NULL,
  review_count INT UNSIGNED NOT NULL DEFAULT 0,
  travel_note_count INT UNSIGNED NOT NULL DEFAULT 0,
  image_count INT UNSIGNED NOT NULL DEFAULT 0,
  review_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attractions_external (external_source, external_id),
  KEY idx_attractions_review (province, region_id, review_status, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS attraction_images (
  id VARCHAR(36) PRIMARY KEY,
  attraction_id VARCHAR(36) NOT NULL,
  source_url VARCHAR(1000) NOT NULL,
  source_provider VARCHAR(40) NOT NULL,
  attribution VARCHAR(500) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  local_path VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attraction_image (attraction_id, source_url(500)),
  CONSTRAINT fk_attraction_images_attraction FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS attraction_sources (
  id VARCHAR(36) PRIMARY KEY,
  attraction_id VARCHAR(36) NOT NULL,
  source_url VARCHAR(1000) NOT NULL,
  source_page_url VARCHAR(1000) NOT NULL,
  retrieved_at DATETIME NOT NULL,
  content_hash CHAR(64) NULL,
  facts_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attraction_source (attraction_id, source_page_url(500)),
  CONSTRAINT fk_attraction_sources_attraction FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
