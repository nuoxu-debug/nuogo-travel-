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

CREATE TABLE IF NOT EXISTS poi_operating_hours (
  id text PRIMARY KEY,
  poi_id text NOT NULL REFERENCES canonical_pois(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at time NULL,
  closes_at time NULL,
  is_closed boolean NOT NULL DEFAULT false,
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL DEFAULT 'OFFICIAL',
  last_reviewed_date date NOT NULL,
  verification_status text NOT NULL DEFAULT 'PENDING_REVIEW',
  verified_at timestamptz NULL,
  verified_by_user_id text NULL REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT poi_operating_hours_source_type_check CHECK (source_type IN ('OFFICIAL', 'GOVERNMENT', 'COMMERCIAL', 'SYSTEM_ESTIMATE')),
  CONSTRAINT poi_operating_hours_verification_status_check CHECK (verification_status IN ('PENDING_REVIEW', 'VERIFIED', 'REJECTED')),
  CONSTRAINT poi_operating_hours_status_check CHECK (status IN ('ACTIVE', 'OUTDATED', 'UNAVAILABLE')),
  CONSTRAINT poi_operating_hours_interval_check CHECK (is_closed OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at))
);

CREATE TABLE IF NOT EXISTS poi_operating_hour_exceptions (
  id text PRIMARY KEY,
  poi_id text NOT NULL REFERENCES canonical_pois(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  opens_at time NULL,
  closes_at time NULL,
  is_closed boolean NOT NULL DEFAULT false,
  reason text NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL DEFAULT 'OFFICIAL',
  last_reviewed_date date NOT NULL,
  verification_status text NOT NULL DEFAULT 'PENDING_REVIEW',
  verified_at timestamptz NULL,
  verified_by_user_id text NULL REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT poi_operating_hour_exceptions_source_type_check CHECK (source_type IN ('OFFICIAL', 'GOVERNMENT', 'COMMERCIAL', 'SYSTEM_ESTIMATE')),
  CONSTRAINT poi_operating_hour_exceptions_verification_status_check CHECK (verification_status IN ('PENDING_REVIEW', 'VERIFIED', 'REJECTED')),
  CONSTRAINT poi_operating_hour_exceptions_status_check CHECK (status IN ('ACTIVE', 'OUTDATED', 'UNAVAILABLE')),
  CONSTRAINT poi_operating_hour_exceptions_interval_check CHECK (is_closed OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at))
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
  destination_id text NULL REFERENCES supported_destinations(id),
  poi_id text NULL REFERENCES canonical_pois(id),
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
  reference_type text NOT NULL DEFAULT 'GENERIC_FALLBACK',
  unit_type text NOT NULL DEFAULT 'PER_PERSON_ENTRY',
  price_basis text NULL,
  source_type text NOT NULL DEFAULT 'SYSTEM_ESTIMATE',
  last_reviewed_date date NULL,
  notes text NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT cost_references_reference_type_check CHECK (reference_type IN ('EXACT', 'FREE', 'CATEGORY_FALLBACK', 'GENERIC_FALLBACK')),
  CONSTRAINT cost_references_unit_type_check CHECK (unit_type IN ('PER_PERSON_ENTRY', 'PER_PERSON_DAY', 'PER_ROOM_NIGHT', 'PER_TRIP', 'PER_LEG')),
  CONSTRAINT cost_references_source_type_check CHECK (source_type IN ('OFFICIAL', 'GOVERNMENT', 'COMMERCIAL', 'SYSTEM_ESTIMATE')),
  CONSTRAINT cost_references_poi_specific_check CHECK (reference_type NOT IN ('EXACT', 'FREE') OR poi_id IS NOT NULL),
  CONSTRAINT cost_references_free_zero_check CHECK (reference_type <> 'FREE' OR (min_fen = 0 AND representative_fen = 0 AND max_fen = 0))
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
CREATE INDEX IF NOT EXISTS idx_poi_operating_hours_lookup ON poi_operating_hours(poi_id, day_of_week, status);
CREATE INDEX IF NOT EXISTS idx_poi_operating_hour_exceptions_lookup ON poi_operating_hour_exceptions(poi_id, exception_date, status);
CREATE INDEX IF NOT EXISTS idx_cost_references_city ON cost_references(city);
CREATE INDEX IF NOT EXISTS idx_cost_references_poi_reference_type ON cost_references(city, poi_id, reference_type, status);
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
  ('sg-public-transport-km-0-32', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_0_32', 109, 109, 109, 'SGD', 'Public Transport Council fare reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-public-transport-km-32-42', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_32_42', 119, 119, 119, 'SGD', 'Public Transport Council fare reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-public-transport-km-42-52', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_42_52', 130, 130, 130, 'SGD', 'Public Transport Council fare reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-public-transport-km-52-72', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_52_72', 150, 150, 150, 'SGD', 'Public Transport Council fare reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-public-transport-km-72-999', 'singapore', 'PUBLIC_TRANSPORT_DISTANCE_FARE', 'KM_72_999', 190, 190, 190, 'SGD', 'Public Transport Council fare reference', 'https://www.ptc.gov.sg/fare-regulation/bus-rail/fare-structure', '2026-09-02', 'ACTIVE'),
  ('sg-taxi-base-fare', 'singapore', 'TAXI_OR_RIDE_HAIL_ESTIMATE', 'BASE_FARE', 420, 420, 420, 'SGD', 'Singapore taxi and ride-hail planning reference', 'https://www.lta.gov.sg/content/ltagov/en/getting_around/taxis_private_hire_cars/taxi_fares_payment_methods.html', '2026-09-02', 'ACTIVE'),
  ('sg-taxi-per-km', 'singapore', 'TAXI_OR_RIDE_HAIL_ESTIMATE', 'PER_KM', 85, 85, 85, 'SGD', 'Singapore taxi and ride-hail planning reference', 'https://www.lta.gov.sg/content/ltagov/en/getting_around/taxis_private_hire_cars/taxi_fares_payment_methods.html', '2026-09-02', 'ACTIVE'),
  ('sg-food-budget', 'singapore', 'FOOD_PERSON_DAY', 'ECONOMY', 2000, 2750, 3500, 'SGD', 'Singapore food planning reference', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-food-balanced', 'singapore', 'FOOD_PERSON_DAY', 'BALANCED', 3500, 4750, 6000, 'SGD', 'Singapore food planning reference', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-food-comfort', 'singapore', 'FOOD_PERSON_DAY', 'COMFORT', 6000, 8000, 10000, 'SGD', 'Singapore food planning reference', 'https://www.visitsingapore.com/dining-drinks-singapore/', '2026-09-02', 'ACTIVE'),
  ('sg-attraction-entry', 'singapore', 'ATTRACTION_PERSON_ENTRY', NULL, 1800, 3550, 5050, 'SGD', 'Klook Gardens by the Bay ticket planning reference', 'https://www.klook.com/en-SG/activity/127-gardens-by-the-bay-singapore/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-museum', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'MUSEUM', 1200, 2500, 4000, 'SGD', 'Nuogo manually maintained Singapore museum planning reference', 'https://www.nhb.gov.sg/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-garden-nature', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'GARDEN_NATURE', 1800, 3550, 5050, 'SGD', 'Klook Gardens by the Bay ticket planning reference', 'https://www.klook.com/en-SG/activity/127-gardens-by-the-bay-singapore/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-observation', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'OBSERVATION', 1800, 3550, 5050, 'SGD', 'Nuogo manually maintained Singapore observation planning reference', 'https://www.visitsingapore.com/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-wildlife', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'WILDLIFE', 3550, 5050, 6200, 'SGD', 'Nuogo manually maintained Singapore wildlife planning reference', 'https://www.visitsingapore.com/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-theme-park', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'THEME_PARK', 7600, 7600, 7600, 'SGD', 'Resorts World Sentosa planning reference', 'https://www.rwsentosa.com/en/attractions/universal-studios-singapore', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-cultural', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'CULTURAL_ATTRACTION', 0, 2500, 4000, 'SGD', 'Nuogo manually maintained Singapore cultural attraction planning reference', 'https://www.nhb.gov.sg/', '2026-09-24', 'ACTIVE'),
  ('sg-attraction-general-paid', 'singapore', 'ATTRACTION_PERSON_ENTRY', 'GENERAL_PAID_ATTRACTION', 1800, 3550, 5050, 'SGD', 'Nuogo manually maintained Singapore general paid attraction planning reference', 'https://www.visitsingapore.com/', '2026-09-24', 'ACTIVE'),
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

UPDATE cost_references
SET
  destination_id = city,
  reference_type = CASE
    WHEN category = 'ATTRACTION_PERSON_ENTRY' AND tier IS NOT NULL THEN 'CATEGORY_FALLBACK'
    ELSE 'GENERIC_FALLBACK'
  END,
  unit_type = CASE
    WHEN category = 'ACCOMMODATION_ROOM_NIGHT' THEN 'PER_ROOM_NIGHT'
    WHEN category IN ('LOCAL_TRANSPORT_PERSON_DAY', 'FOOD_PERSON_DAY', 'MISCELLANEOUS_PERSON_DAY') THEN 'PER_PERSON_DAY'
    WHEN category IN ('PUBLIC_TRANSPORT_DISTANCE_FARE', 'TAXI_OR_RIDE_HAIL_ESTIMATE') THEN 'PER_LEG'
    ELSE 'PER_PERSON_ENTRY'
  END,
  source_type = CASE
    WHEN source_name ILIKE '%public transport%' OR source_name ILIKE '%lta%' OR source_name ILIKE '%nhb%' THEN 'GOVERNMENT'
    WHEN source_name ILIKE '%trip.com%' OR source_name ILIKE '%klook%' OR source_name ILIKE '%resorts world%' THEN 'COMMERCIAL'
    ELSE 'SYSTEM_ESTIMATE'
  END,
  price_basis = COALESCE(price_basis, tier, category),
  last_reviewed_date = COALESCE(last_reviewed_date, collected_on),
  notes = COALESCE(notes, 'Planning reference; not a guaranteed live price.')
WHERE city = 'singapore';

INSERT INTO canonical_pois
  (id, destination_id, name_json, category, latitude, longitude, address_json, status)
VALUES
  ('demo-sg-singapore-zoo', 'singapore', '{"en":"Singapore Zoo","zh":"Singapore Zoo"}'::jsonb, 'ATTRACTION', 1.4043000, 103.7930000, NULL, 'ACTIVE'),
  ('demo-sg-merlion-park', 'singapore', '{"en":"Merlion Park","zh":"Merlion Park"}'::jsonb, 'ATTRACTION', 1.2868000, 103.8545000, NULL, 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  destination_id = EXCLUDED.destination_id,
  name_json = EXCLUDED.name_json,
  category = EXCLUDED.category,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  address_json = EXCLUDED.address_json,
  status = EXCLUDED.status;

INSERT INTO cost_references
  (id, city, destination_id, poi_id, category, tier, min_fen, representative_fen, max_fen,
   currency, source_name, source_url, collected_on, updated_at, reference_type, unit_type,
   price_basis, source_type, last_reviewed_date, notes, status)
VALUES
  ('sg-poi-singapore-zoo-exact', 'singapore', 'singapore', 'demo-sg-singapore-zoo', 'ATTRACTION_PERSON_ENTRY', NULL, 4900, 4900, 4900, 'SGD',
   'Mandai Wildlife Reserve', 'https://www.mandai.com/en/tickets-and-passes/single-attractions/singapore-zoo.html',
   '2026-09-24', now(), 'EXACT', 'PER_PERSON_ENTRY', 'Non-Resident Adult', 'OFFICIAL', '2026-09-24',
   'Planning price reference, not a guaranteed live ticket price.', 'ACTIVE'),
  ('sg-poi-merlion-park-free', 'singapore', 'singapore', 'demo-sg-merlion-park', 'ATTRACTION_PERSON_ENTRY', NULL, 0, 0, 0, 'SGD',
   'Nuogo curated Singapore free public-attraction reference', 'https://www.visitsingapore.com/',
   '2026-09-24', now(), 'FREE', 'PER_PERSON_ENTRY', 'Free public attraction', 'SYSTEM_ESTIMATE', '2026-09-24',
   'Explicit free planning reference; unknown attractions never default to zero.', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  city = EXCLUDED.city,
  destination_id = EXCLUDED.destination_id,
  poi_id = EXCLUDED.poi_id,
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  min_fen = EXCLUDED.min_fen,
  representative_fen = EXCLUDED.representative_fen,
  max_fen = EXCLUDED.max_fen,
  currency = EXCLUDED.currency,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  collected_on = EXCLUDED.collected_on,
  updated_at = EXCLUDED.updated_at,
  reference_type = EXCLUDED.reference_type,
  unit_type = EXCLUDED.unit_type,
  price_basis = EXCLUDED.price_basis,
  source_type = EXCLUDED.source_type,
  last_reviewed_date = EXCLUDED.last_reviewed_date,
  notes = EXCLUDED.notes,
  status = EXCLUDED.status;
