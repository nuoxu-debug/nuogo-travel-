-- Run manually in Supabase SQL editor after applying singapore_pilot_25_pois.sql.
SELECT 'singapore_canonical_poi_count' AS check_name, count(*)::text AS result
FROM canonical_pois
WHERE destination_id = 'singapore'
  AND id IN (SELECT unnest(ARRAY[
    'demo-sg-merlion-park','demo-sg-singapore-zoo','sg-flower-dome-cloud-forest','sg-ocbc-skyway',
    'sg-supertree-observatory','sg-mbs-skypark','sg-artscience-museum','sg-singapore-flyer',
    'sg-national-gallery','sg-asian-civilisations-museum','sg-singapore-city-gallery',
    'sg-buddha-tooth-relic-temple','sg-sri-mariamman-temple','sg-sultan-mosque',
    'sg-indian-heritage-centre','sg-botanic-gardens','sg-national-orchid-garden',
    'sg-fort-canning-park','sg-sungei-buloh','sg-river-wonders','sg-bird-paradise',
    'sg-night-safari','sg-universal-studios','sg-singapore-oceanarium','sg-adventure-cove'
  ]))
UNION ALL
SELECT 'duplicate_poi_ids', count(*)::text
FROM (
  SELECT id FROM canonical_pois GROUP BY id HAVING count(*) > 1
) duplicates
UNION ALL
SELECT 'null_latitude_longitude', count(*)::text
FROM canonical_pois
WHERE destination_id = 'singapore' AND (latitude IS NULL OR longitude IS NULL)
UNION ALL
SELECT 'coordinates_outside_singapore_bounds', count(*)::text
FROM canonical_pois
WHERE destination_id = 'singapore'
  AND (latitude < 1.10 OR latitude > 1.50 OR longitude < 103.50 OR longitude > 104.10)
UNION ALL
SELECT 'pois_with_cost_references', count(DISTINCT poi_id)::text
FROM cost_references
WHERE city = 'singapore' AND id LIKE 'sg25-cost-%' AND status = 'ACTIVE'
UNION ALL
SELECT 'pois_with_operating_hour_records', count(DISTINCT poi_id)::text
FROM poi_operating_hours
WHERE id LIKE 'sg25-hours-%' AND status = 'ACTIVE'
UNION ALL
SELECT 'pois_with_source_records', count(DISTINCT poi_id)::text
FROM poi_source_records
WHERE id LIKE 'sg25-src-%'
UNION ALL
SELECT 'orphan_source_records', count(*)::text
FROM poi_source_records source
LEFT JOIN canonical_pois poi ON poi.id = source.poi_id
WHERE source.id LIKE 'sg25-src-%' AND poi.id IS NULL
UNION ALL
SELECT 'orphan_operating_hour_records', count(*)::text
FROM poi_operating_hours hours
LEFT JOIN canonical_pois poi ON poi.id = hours.poi_id
WHERE hours.id LIKE 'sg25-hours-%' AND poi.id IS NULL
UNION ALL
SELECT 'orphan_cost_reference_records', count(*)::text
FROM cost_references cost
LEFT JOIN canonical_pois poi ON poi.id = cost.poi_id
WHERE cost.id LIKE 'sg25-cost-%' AND poi.id IS NULL
UNION ALL
SELECT 'duplicate_operating_hour_rows', count(*)::text
FROM (
  SELECT poi_id, day_of_week, opens_at, closes_at, count(*)
  FROM poi_operating_hours
  WHERE id LIKE 'sg25-hours-%'
  GROUP BY poi_id, day_of_week, opens_at, closes_at
  HAVING count(*) > 1
) duplicates
UNION ALL
SELECT 'duplicate_cost_reference_rows', count(*)::text
FROM (
  SELECT poi_id, category, reference_type, price_basis, count(*)
  FROM cost_references
  WHERE id LIKE 'sg25-cost-%'
  GROUP BY poi_id, category, reference_type, price_basis
  HAVING count(*) > 1
) duplicates;
