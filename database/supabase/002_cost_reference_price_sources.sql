ALTER TABLE cost_references
  ADD COLUMN IF NOT EXISTS destination_id text NULL,
  ADD COLUMN IF NOT EXISTS poi_id text NULL,
  ADD COLUMN IF NOT EXISTS reference_type text NOT NULL DEFAULT 'GENERIC_FALLBACK',
  ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'PER_PERSON_ENTRY',
  ADD COLUMN IF NOT EXISTS price_basis text NULL,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'SYSTEM_ESTIMATE',
  ADD COLUMN IF NOT EXISTS last_reviewed_date date NULL,
  ADD COLUMN IF NOT EXISTS notes text NULL;

UPDATE cost_references
SET
  destination_id = COALESCE(destination_id, city),
  reference_type = CASE
    WHEN reference_type IS NOT NULL AND reference_type <> 'GENERIC_FALLBACK' THEN reference_type
    WHEN category = 'ATTRACTION_PERSON_ENTRY' AND tier IS NOT NULL THEN 'CATEGORY_FALLBACK'
    ELSE 'GENERIC_FALLBACK'
  END,
  unit_type = CASE
    WHEN unit_type IS NOT NULL AND unit_type <> 'PER_PERSON_ENTRY' THEN unit_type
    WHEN category = 'ACCOMMODATION_ROOM_NIGHT' THEN 'PER_ROOM_NIGHT'
    WHEN category IN ('LOCAL_TRANSPORT_PERSON_DAY', 'FOOD_PERSON_DAY', 'MISCELLANEOUS_PERSON_DAY') THEN 'PER_PERSON_DAY'
    WHEN category IN ('PUBLIC_TRANSPORT_DISTANCE_FARE', 'TAXI_OR_RIDE_HAIL_ESTIMATE') THEN 'PER_LEG'
    ELSE 'PER_PERSON_ENTRY'
  END,
  source_type = CASE
    WHEN source_type IS NOT NULL AND source_type <> 'SYSTEM_ESTIMATE' THEN source_type
    WHEN source_name ILIKE '%public transport%' OR source_name ILIKE '%lta%' OR source_name ILIKE '%nhb%' THEN 'GOVERNMENT'
    WHEN source_name ILIKE '%trip.com%' OR source_name ILIKE '%klook%' OR source_name ILIKE '%resorts world%' THEN 'COMMERCIAL'
    ELSE 'SYSTEM_ESTIMATE'
  END,
  price_basis = COALESCE(price_basis, tier, category),
  last_reviewed_date = COALESCE(last_reviewed_date, collected_on),
  notes = COALESCE(notes, 'Planning reference; not a guaranteed live price.');

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

CREATE INDEX IF NOT EXISTS idx_cost_references_poi_reference_type
  ON cost_references(city, poi_id, reference_type, status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_references_reference_type_check') THEN
    ALTER TABLE cost_references
      ADD CONSTRAINT cost_references_reference_type_check
      CHECK (reference_type IN ('EXACT', 'FREE', 'CATEGORY_FALLBACK', 'GENERIC_FALLBACK'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_references_unit_type_check') THEN
    ALTER TABLE cost_references
      ADD CONSTRAINT cost_references_unit_type_check
      CHECK (unit_type IN ('PER_PERSON_ENTRY', 'PER_PERSON_DAY', 'PER_ROOM_NIGHT', 'PER_TRIP', 'PER_LEG'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_references_source_type_check') THEN
    ALTER TABLE cost_references
      ADD CONSTRAINT cost_references_source_type_check
      CHECK (source_type IN ('OFFICIAL', 'GOVERNMENT', 'COMMERCIAL', 'SYSTEM_ESTIMATE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_references_poi_specific_check') THEN
    ALTER TABLE cost_references
      ADD CONSTRAINT cost_references_poi_specific_check
      CHECK (reference_type NOT IN ('EXACT', 'FREE') OR poi_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_references_free_zero_check') THEN
    ALTER TABLE cost_references
      ADD CONSTRAINT cost_references_free_zero_check
      CHECK (reference_type <> 'FREE' OR (min_fen = 0 AND representative_fen = 0 AND max_fen = 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_references_destination_id_fkey') THEN
    ALTER TABLE cost_references
      ADD CONSTRAINT cost_references_destination_id_fkey
      FOREIGN KEY (destination_id) REFERENCES supported_destinations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_references_poi_id_fkey') THEN
    ALTER TABLE cost_references
      ADD CONSTRAINT cost_references_poi_id_fkey
      FOREIGN KEY (poi_id) REFERENCES canonical_pois(id);
  END IF;
END $$;
