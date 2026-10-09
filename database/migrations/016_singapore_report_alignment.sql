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
  ('sg-public-transport-km-0-32', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_0_32', 109, 109, 109, 'SGD', 'Public Transport Council - adult card fare 0.0km to 3.2km', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-public-transport-km-32-42', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_32_42', 119, 119, 119, 'SGD', 'Public Transport Council - adult card fare above 3.2km to 4.2km', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-public-transport-km-42-52', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_42_52', 130, 130, 130, 'SGD', 'Public Transport Council - adult card fare above 4.2km to 5.2km', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-public-transport-km-52-72', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_52_72', 150, 150, 150, 'SGD', 'Public Transport Council - adult card fare above 5.2km to 7.2km', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-public-transport-km-72-999', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_72_999', 190, 190, 190, 'SGD', 'Public Transport Council - adult card fare above 7.2km planning cap', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-taxi-base-fare', 'singapore', 'TAXI_OR_RIDE_HAIL_ESTIMATE', 'BASE_FARE', 420, 420, 420, 'SGD', 'Singapore taxi and ride-hail planning reference - base fare', 'https://www.lta.gov.sg/content/ltagov/en/getting_around/taxis_private_hire_cars/taxi_fares_payment_methods.html', '2026-09-02', 'ACTIVE'),
  ('sg-taxi-per-km', 'singapore', 'TAXI_OR_RIDE_HAIL_ESTIMATE', 'PER_KM', 85, 85, 85, 'SGD', 'Singapore taxi and ride-hail planning reference - per kilometre', 'https://www.lta.gov.sg/content/ltagov/en/getting_around/taxis_private_hire_cars/taxi_fares_payment_methods.html', '2026-09-02', 'ACTIVE'),
  ('sg-food-budget', 'singapore', 'FOOD_PERSON_DAY', 'ECONOMY', 2000, 2750, 3500, 'SGD', 'Singapore food planning reference - budget daily range', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-food-balanced', 'singapore', 'FOOD_PERSON_DAY', 'BALANCED', 3500, 4750, 6000, 'SGD', 'Singapore food planning reference - balanced daily range', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-food-comfort', 'singapore', 'FOOD_PERSON_DAY', 'COMFORT', 6000, 8000, 10000, 'SGD', 'Singapore food planning reference - comfort daily range', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-attraction-entry', 'singapore', 'ATTRACTION_PERSON_ENTRY', NULL, 1800, 3550, 5050, 'SGD', 'Klook Gardens by the Bay ticket planning references - Floral Fantasy to three-attraction package range', 'https://www.klook.com/en-SG/activity/127-gardens-by-the-bay-singapore/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-museum', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'MUSEUM', 1200, 2500, 4000, 'SGD', 'Nuogo manually maintained Singapore museum planning references - museum admission category estimate', 'https://www.nhb.gov.sg/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-garden-nature', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'GARDEN_NATURE', 1800, 3550, 5050, 'SGD', 'Klook Gardens by the Bay ticket references - garden and nature category estimate', 'https://www.klook.com/en-SG/activity/127-gardens-by-the-bay-singapore/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-observation', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'OBSERVATION', 1800, 3550, 5050, 'SGD', 'Nuogo manually maintained Singapore attraction category planning references - observation category estimate', 'https://www.visitsingapore.com/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-wildlife', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'WILDLIFE', 3550, 5050, 6200, 'SGD', 'Nuogo manually maintained Singapore attraction category planning references - wildlife category estimate', 'https://www.visitsingapore.com/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-theme-park', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'THEME_PARK', 7600, 7600, 7600, 'SGD', 'Resorts World Sentosa admission reference - theme park category estimate', 'https://www.rwsentosa.com/en/attractions/universal-studios-singapore', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-cultural', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'CULTURAL_ATTRACTION', 0, 2500, 4000, 'SGD', 'Nuogo manually maintained Singapore museum planning references - cultural attraction category estimate', 'https://www.nhb.gov.sg/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-general-paid', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'GENERAL_PAID_ATTRACTION', 1800, 3550, 5050, 'SGD', 'Nuogo manually maintained Singapore attraction category planning references - general paid attraction category estimate', 'https://www.visitsingapore.com/', '2026-09-24', 'ACTIVE'),
  ('sg-entertainment-entry', 'singapore', 'ENTERTAINMENT_PERSON_ENTRY', NULL, 7600, 7600, 7600, 'SGD', 'Resorts World Sentosa - Universal Studios Singapore from-price reference', 'https://www.rwsentosa.com/en/attractions/universal-studios-singapore', '2026-09-02', 'ACTIVE'),
  ('sg-misc-budget', 'singapore', 'MISCELLANEOUS_PERSON_DAY', 'BUDGET', 1000, 1000, 1000, 'SGD', 'Nuogo report Table 3.11 planning allowance', 'https://nuogo.local/report-reference', '2026-09-02', 'ACTIVE'),
  ('sg-misc-balanced', 'singapore', 'MISCELLANEOUS_PERSON_DAY', 'BALANCED', 2000, 2000, 2000, 'SGD', 'Nuogo report Table 3.11 planning allowance', 'https://nuogo.local/report-reference', '2026-09-02', 'ACTIVE'),
  ('sg-misc-comfort', 'singapore', 'MISCELLANEOUS_PERSON_DAY', 'COMFORT', 3000, 3000, 3000, 'SGD', 'Nuogo report Table 3.11 planning allowance', 'https://nuogo.local/report-reference', '2026-09-02', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  min_fen = VALUES(min_fen), representative_fen = VALUES(representative_fen),
  max_fen = VALUES(max_fen), currency = VALUES(currency),
  source_name = VALUES(source_name), source_url = VALUES(source_url),
  collected_on = VALUES(collected_on), status = VALUES(status);
