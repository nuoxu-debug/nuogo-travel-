CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  preferred_language text NOT NULL DEFAULT 'zh',
  account_type text NOT NULL DEFAULT 'REGISTERED',
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'ACTIVE',
  password_hash text NOT NULL,
  guest_last_activity_at timestamptz NULL,
  guest_expires_at timestamptz NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS privacy_consents (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type text NOT NULL DEFAULT 'GENERAL',
  version text NOT NULL,
  accepted boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, consent_type)
);

CREATE TABLE IF NOT EXISTS supported_destinations (
  id text PRIMARY KEY,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  center_latitude numeric(10, 7) NOT NULL,
  center_longitude numeric(10, 7) NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS canonical_pois (
  id text PRIMARY KEY,
  destination_id text NOT NULL REFERENCES supported_destinations(id),
  name_json jsonb NOT NULL,
  category text NOT NULL,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  address_json jsonb NULL,
  status text NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS poi_source_records (
  id text PRIMARY KEY,
  poi_id text NOT NULL REFERENCES canonical_pois(id) ON DELETE CASCADE,
  provider text NOT NULL,
  source_id text NOT NULL,
  source_url text NULL,
  retrieved_at timestamptz NOT NULL,
  expires_at timestamptz NULL,
  raw_json jsonb NULL
);

CREATE TABLE IF NOT EXISTS route_cache (
  cache_key text PRIMARY KEY,
  mode text NOT NULL,
  distance_meters integer NOT NULL,
  duration_seconds integer NOT NULL,
  route_json jsonb NOT NULL,
  provider text NOT NULL,
  source_id text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  expires_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS cost_references (
  id text PRIMARY KEY,
  city text NOT NULL,
  category text NOT NULL,
  tier text NULL,
  min_fen integer NOT NULL,
  representative_fen integer NOT NULL,
  max_fen integer NOT NULL,
  currency text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  collected_on date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS trips (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_trip_id text NULL,
  status text NOT NULL DEFAULT 'draft',
  title_en text NOT NULL,
  title_zh text NOT NULL,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_budget numeric(12, 2) NOT NULL,
  preferences_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  objective_payload_json jsonb NULL,
  persistence_scope text NOT NULL DEFAULT 'PERSISTENT',
  expires_at timestamptz NULL,
  guest_claim_token_hash text NULL,
  revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itinerary_runs (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  profile text NOT NULL,
  state text NOT NULL,
  estimated_total_fen integer NULL,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS trip_legs (
  id text PRIMARY KEY,
  itinerary_run_id text NOT NULL REFERENCES itinerary_runs(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  sequence integer NOT NULL,
  leg_json jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS itinerary_provenance (
  id text PRIMARY KEY,
  itinerary_run_id text NOT NULL REFERENCES itinerary_runs(id) ON DELETE CASCADE,
  path text NOT NULL,
  source_json jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS itinerary_validation_issues (
  id text PRIMARY KEY,
  itinerary_run_id text NOT NULL REFERENCES itinerary_runs(id) ON DELETE CASCADE,
  code text NOT NULL,
  path text NOT NULL,
  severity text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS itinerary_repairs (
  id text PRIMARY KEY,
  itinerary_run_id text NOT NULL REFERENCES itinerary_runs(id) ON DELETE CASCADE,
  attempt integer NOT NULL,
  repair_json jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_system_records (
  id text PRIMARY KEY,
  level text NOT NULL,
  event text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_guest_expiry ON users(account_type, guest_expires_at);
CREATE INDEX IF NOT EXISTS idx_trips_user_updated ON trips(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_trips_session_expiry ON trips(persistence_scope, expires_at);
CREATE INDEX IF NOT EXISTS idx_poi_source_records_poi ON poi_source_records(poi_id);
CREATE INDEX IF NOT EXISTS idx_cost_references_city ON cost_references(city);
CREATE INDEX IF NOT EXISTS idx_trip_legs_run_order ON trip_legs(itinerary_run_id, day_number, sequence);

INSERT INTO supported_destinations
  (id, name_en, name_zh, center_latitude, center_longitude, status)
VALUES
  ('singapore', 'Singapore', '新加坡', 1.3521000, 103.8198000, 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  center_latitude = EXCLUDED.center_latitude,
  center_longitude = EXCLUDED.center_longitude,
  status = EXCLUDED.status;

INSERT INTO cost_references
  (id, city, category, tier, min_fen, representative_fen, max_fen,
   currency, source_name, source_url, collected_on, status)
VALUES
  ('sg-accommodation-budget', 'singapore', 'ACCOMMODATION_ROOM_NIGHT', 'BUDGET', 6800, 6800, 6800, 'SGD', 'Trip.com Singapore planning reference', 'https://sg.trip.com/hotels/', '2026-09-02', 'ACTIVE'),
  ('sg-accommodation-mid', 'singapore', 'ACCOMMODATION_ROOM_NIGHT', 'MID_RANGE', 16500, 16500, 16500, 'SGD', 'Trip.com Singapore planning reference', 'https://sg.trip.com/hotels/', '2026-09-02', 'ACTIVE'),
  ('sg-accommodation-comfort', 'singapore', 'ACCOMMODATION_ROOM_NIGHT', 'COMFORT', 66000, 66000, 66000, 'SGD', 'Trip.com Singapore planning reference', 'https://sg.trip.com/hotels/', '2026-09-02', 'ACTIVE'),
  ('sg-transport-budget', 'singapore', 'LOCAL_TRANSPORT_PERSON_DAY', 'BUDGET', 128, 128, 128, 'SGD', 'Public Transport Council planning reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-transport-balanced', 'singapore', 'LOCAL_TRANSPORT_PERSON_DAY', 'BALANCED', 190, 190, 190, 'SGD', 'Public Transport Council planning reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-transport-comfort', 'singapore', 'LOCAL_TRANSPORT_PERSON_DAY', 'COMFORT', 257, 257, 257, 'SGD', 'Public Transport Council planning reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-food-budget', 'singapore', 'FOOD_PERSON_DAY', 'ECONOMY', 2000, 2750, 3500, 'SGD', 'Singapore food planning reference', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-food-balanced', 'singapore', 'FOOD_PERSON_DAY', 'BALANCED', 3500, 4750, 6000, 'SGD', 'Singapore food planning reference', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-food-comfort', 'singapore', 'FOOD_PERSON_DAY', 'COMFORT', 6000, 8000, 10000, 'SGD', 'Singapore food planning reference', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-attraction-entry', 'singapore', 'ATTRACTION_PERSON_ENTRY', NULL, 1400, 4600, 5800, 'SGD', 'Gardens by the Bay admission planning reference', 'https://www.gardensbythebay.com.sg/en/ticketing/admission-rates.html', '2026-09-02', 'ACTIVE'),
  ('sg-entertainment-entry', 'singapore', 'ENTERTAINMENT_PERSON_ENTRY', NULL, 7600, 7600, 7600, 'SGD', 'Resorts World Sentosa planning reference', 'https://www.rwsentosa.com/en/attractions/universal-studios-singapore', '2026-09-02', 'ACTIVE'),
  ('sg-misc-budget', 'singapore', 'MISCELLANEOUS_PERSON_DAY', 'BUDGET', 1000, 1000, 1000, 'SGD', 'Nuogo planning allowance', 'https://nuogo.local/report-reference', '2026-09-02', 'ACTIVE'),
  ('sg-misc-balanced', 'singapore', 'MISCELLANEOUS_PERSON_DAY', 'BALANCED', 2000, 2000, 2000, 'SGD', 'Nuogo planning allowance', 'https://nuogo.local/report-reference', '2026-09-02', 'ACTIVE'),
  ('sg-misc-comfort', 'singapore', 'MISCELLANEOUS_PERSON_DAY', 'COMFORT', 3000, 3000, 3000, 'SGD', 'Nuogo planning allowance', 'https://nuogo.local/report-reference', '2026-09-02', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  city = EXCLUDED.city,
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  min_fen = EXCLUDED.min_fen,
  representative_fen = EXCLUDED.representative_fen,
  max_fen = EXCLUDED.max_fen,
  currency = EXCLUDED.currency,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  collected_on = EXCLUDED.collected_on,
  status = EXCLUDED.status;
