INSERT INTO supported_destinations
  (id, name_en, name_zh, center_latitude, center_longitude, status)
VALUES
  ('singapore', 'Singapore', '新加坡', 1.3521000, 103.8198000, 'ACTIVE')
ON DUPLICATE KEY UPDATE
  name_en = VALUES(name_en), name_zh = VALUES(name_zh),
  center_latitude = VALUES(center_latitude), center_longitude = VALUES(center_longitude),
  status = 'ACTIVE';

UPDATE supported_destinations
SET status = 'UNAVAILABLE'
WHERE id IN ('beijing', 'shanghai', 'xian');

ALTER TABLE users
  ADD COLUMN guest_last_activity_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN guest_expires_at TIMESTAMP NULL DEFAULT NULL,
  ADD INDEX idx_users_guest_expiry (account_type, guest_expires_at);

ALTER TABLE trips
  ADD COLUMN persistence_scope ENUM('SESSION', 'PERSISTENT') NOT NULL DEFAULT 'PERSISTENT',
  ADD COLUMN expires_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN guest_claim_token_hash CHAR(64) NULL DEFAULT NULL,
  ADD INDEX idx_trips_session_expiry (persistence_scope, expires_at);

INSERT INTO cost_references
  (id, city, category, tier, min_fen, representative_fen, max_fen,
   currency, source_name, source_url, collected_on, status)
VALUES
  ('sg-accommodation-budget', 'singapore', 'ACCOMMODATION_ROOM_NIGHT', 'BUDGET', 6800, 6800, 6800, 'SGD', 'Trip.com Singapore - Robertson Quay Hotel planning reference', 'https://sg.trip.com/hotels/', '2026-09-02', 'ACTIVE'),
  ('sg-accommodation-mid', 'singapore', 'ACCOMMODATION_ROOM_NIGHT', 'MID_RANGE', 16500, 16500, 16500, 'SGD', 'Trip.com Singapore - Furama RiverFront planning reference', 'https://sg.trip.com/hotels/', '2026-09-02', 'ACTIVE'),
  ('sg-accommodation-comfort', 'singapore', 'ACCOMMODATION_ROOM_NIGHT', 'COMFORT', 66000, 66000, 66000, 'SGD', 'Trip.com Singapore - Mandarin Oriental planning reference', 'https://sg.trip.com/hotels/', '2026-09-02', 'ACTIVE'),
  ('sg-transport-budget', 'singapore', 'LOCAL_TRANSPORT_PERSON_DAY', 'BUDGET', 128, 128, 128, 'SGD', 'Public Transport Council - short-distance planning reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-transport-balanced', 'singapore', 'LOCAL_TRANSPORT_PERSON_DAY', 'BALANCED', 190, 190, 190, 'SGD', 'Public Transport Council - medium-distance planning reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-transport-comfort', 'singapore', 'LOCAL_TRANSPORT_PERSON_DAY', 'COMFORT', 257, 257, 257, 'SGD', 'Public Transport Council - long-distance planning cap', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-food-budget', 'singapore', 'FOOD_PERSON_DAY', 'ECONOMY', 2000, 2750, 3500, 'SGD', 'Singapore food planning reference - budget daily range', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-food-balanced', 'singapore', 'FOOD_PERSON_DAY', 'BALANCED', 3500, 4750, 6000, 'SGD', 'Singapore food planning reference - balanced daily range', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-food-comfort', 'singapore', 'FOOD_PERSON_DAY', 'COMFORT', 6000, 8000, 10000, 'SGD', 'Singapore food planning reference - comfort daily range', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-attraction-entry', 'singapore', 'ATTRACTION_PERSON_ENTRY', NULL, 1400, 4600, 5800, 'SGD', 'Gardens by the Bay published admission planning references', 'https://www.gardensbythebay.com.sg/en/ticketing/admission-rates.html', '2026-09-02', 'ACTIVE'),
  ('sg-entertainment-entry', 'singapore', 'ENTERTAINMENT_PERSON_ENTRY', NULL, 7600, 7600, 7600, 'SGD', 'Resorts World Sentosa - Universal Studios Singapore from-price reference', 'https://www.rwsentosa.com/en/attractions/universal-studios-singapore', '2026-09-02', 'ACTIVE'),
  ('sg-misc-budget', 'singapore', 'MISCELLANEOUS_PERSON_DAY', 'BUDGET', 1000, 1000, 1000, 'SGD', 'Nuogo report Table 3.11 planning allowance', 'https://nuogo.local/report-reference', '2026-09-02', 'ACTIVE'),
  ('sg-misc-balanced', 'singapore', 'MISCELLANEOUS_PERSON_DAY', 'BALANCED', 2000, 2000, 2000, 'SGD', 'Nuogo report Table 3.11 planning allowance', 'https://nuogo.local/report-reference', '2026-09-02', 'ACTIVE'),
  ('sg-misc-comfort', 'singapore', 'MISCELLANEOUS_PERSON_DAY', 'COMFORT', 3000, 3000, 3000, 'SGD', 'Nuogo report Table 3.11 planning allowance', 'https://nuogo.local/report-reference', '2026-09-02', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  min_fen = VALUES(min_fen), representative_fen = VALUES(representative_fen),
  max_fen = VALUES(max_fen), currency = VALUES(currency),
  source_name = VALUES(source_name), source_url = VALUES(source_url),
  collected_on = VALUES(collected_on), status = VALUES(status);
