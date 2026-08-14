USE nuogo;

ALTER TABLE trips
  ADD COLUMN objective_payload_json JSON NULL AFTER preferences_json;
