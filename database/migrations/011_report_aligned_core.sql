ALTER TABLE cost_references
  DROP FOREIGN KEY fk_cost_reference_destination,
  DROP INDEX idx_cost_reference_lookup;

ALTER TABLE cost_references
  CHANGE COLUMN destination_id city VARCHAR(40) NOT NULL,
  ADD COLUMN tier VARCHAR(40) NULL AFTER category,
  ADD COLUMN min_fen BIGINT UNSIGNED NULL AFTER tier,
  CHANGE COLUMN amount_fen representative_fen BIGINT UNSIGNED NOT NULL,
  ADD COLUMN max_fen BIGINT UNSIGNED NULL AFTER representative_fen,
  ADD COLUMN currency CHAR(3) NULL AFTER max_fen,
  ADD COLUMN source_name VARCHAR(160) NULL AFTER currency,
  ADD COLUMN source_url VARCHAR(2048) NULL AFTER source_name,
  ADD COLUMN collected_on DATE NULL AFTER source_url;

UPDATE cost_references
SET min_fen = representative_fen,
    max_fen = representative_fen,
    currency = 'CNY',
    source_name = JSON_UNQUOTE(JSON_EXTRACT(source_json, '$.provider')),
    source_url = JSON_UNQUOTE(JSON_EXTRACT(source_json, '$.sourceUrl')),
    collected_on = DATE(JSON_UNQUOTE(JSON_EXTRACT(source_json, '$.retrievedAt'))),
    status = CASE
      WHEN JSON_UNQUOTE(JSON_EXTRACT(source_json, '$.provider')) IS NULL
        OR JSON_UNQUOTE(JSON_EXTRACT(source_json, '$.sourceUrl')) IS NULL
        OR JSON_UNQUOTE(JSON_EXTRACT(source_json, '$.retrievedAt')) IS NULL
        OR category IN ('FUEL_LITRE', 'PARKING_DAY')
        OR category NOT IN (
          'INTERCITY_TRANSPORT_PERSON_TRIP', 'ACCOMMODATION_ROOM_NIGHT',
          'LOCAL_TRANSPORT_PERSON_DAY', 'FOOD_PERSON_MEAL',
          'ATTRACTION_PERSON_ENTRY', 'ENTERTAINMENT_PERSON_ENTRY', 'OTHER_TRIP'
        )
        OR (category IN (
          'ACCOMMODATION_ROOM_NIGHT', 'LOCAL_TRANSPORT_PERSON_DAY', 'FOOD_PERSON_MEAL'
        ) AND tier IS NULL)
      THEN 'UNAVAILABLE'
      ELSE status
    END;

ALTER TABLE cost_references
  MODIFY COLUMN min_fen BIGINT UNSIGNED NOT NULL,
  MODIFY COLUMN max_fen BIGINT UNSIGNED NOT NULL,
  MODIFY COLUMN currency CHAR(3) NOT NULL,
  MODIFY COLUMN updated_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  DROP COLUMN unit,
  DROP COLUMN source_json,
  DROP COLUMN effective_from,
  DROP COLUMN effective_to,
  ADD CONSTRAINT chk_cost_reference_range
    CHECK (min_fen <= representative_fen AND representative_fen <= max_fen),
  ADD KEY idx_cost_reference_lookup (city, category, tier, status),
  ADD CONSTRAINT fk_cost_reference_city FOREIGN KEY (city)
    REFERENCES supported_destinations(id);
