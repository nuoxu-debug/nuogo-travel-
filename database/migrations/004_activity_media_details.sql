USE nuogo;

ALTER TABLE activities
  ADD COLUMN image_url VARCHAR(500) NULL AFTER source_url,
  ADD COLUMN image_attribution VARCHAR(255) NULL AFTER image_url,
  ADD COLUMN visit_details_json JSON NULL AFTER image_attribution;
