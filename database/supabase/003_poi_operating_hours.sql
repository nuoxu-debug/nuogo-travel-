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

ALTER TABLE poi_operating_hours
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS verified_by_user_id text NULL;

ALTER TABLE poi_operating_hour_exceptions
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS verified_by_user_id text NULL;

CREATE INDEX IF NOT EXISTS idx_poi_operating_hours_lookup
  ON poi_operating_hours(poi_id, day_of_week, status);

CREATE INDEX IF NOT EXISTS idx_poi_operating_hour_exceptions_lookup
  ON poi_operating_hour_exceptions(poi_id, exception_date, status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_operating_hours_verification_status_check') THEN
    ALTER TABLE poi_operating_hours
      ADD CONSTRAINT poi_operating_hours_verification_status_check
      CHECK (verification_status IN ('PENDING_REVIEW', 'VERIFIED', 'REJECTED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_operating_hour_exceptions_verification_status_check') THEN
    ALTER TABLE poi_operating_hour_exceptions
      ADD CONSTRAINT poi_operating_hour_exceptions_verification_status_check
      CHECK (verification_status IN ('PENDING_REVIEW', 'VERIFIED', 'REJECTED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_operating_hours_verified_by_user_id_fkey') THEN
    ALTER TABLE poi_operating_hours
      ADD CONSTRAINT poi_operating_hours_verified_by_user_id_fkey
      FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_operating_hour_exceptions_verified_by_user_id_fkey') THEN
    ALTER TABLE poi_operating_hour_exceptions
      ADD CONSTRAINT poi_operating_hour_exceptions_verified_by_user_id_fkey
      FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
