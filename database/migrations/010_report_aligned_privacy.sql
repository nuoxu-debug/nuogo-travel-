ALTER TABLE privacy_consents
  ADD COLUMN consent_type VARCHAR(64) NOT NULL DEFAULT 'GENERAL' AFTER user_id;

ALTER TABLE privacy_consents
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (user_id, consent_type);
