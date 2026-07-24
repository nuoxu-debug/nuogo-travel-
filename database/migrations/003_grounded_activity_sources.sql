USE nuogo;

ALTER TABLE activities
  ADD COLUMN source_attraction_id VARCHAR(36) NULL AFTER guide_json,
  ADD COLUMN source_provider VARCHAR(80) NULL AFTER source_attraction_id,
  ADD COLUMN source_url VARCHAR(2048) NULL AFTER source_provider,
  ADD COLUMN location_is_estimated BOOLEAN NULL AFTER source_url;
