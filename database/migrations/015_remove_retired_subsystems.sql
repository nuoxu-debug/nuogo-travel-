USE nuogo;

DROP TABLE IF EXISTS activity_votes;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS trip_shares;

DROP TABLE IF EXISTS expense_participants;
DROP TABLE IF EXISTS trip_expenses;
DROP TABLE IF EXISTS trip_invitations;
DROP TABLE IF EXISTS trip_members;
DROP TABLE IF EXISTS trip_activity_log;

DROP TABLE IF EXISTS attraction_images;
DROP TABLE IF EXISTS attraction_sources;
DROP TABLE IF EXISTS attractions;
DROP TABLE IF EXISTS scrape_jobs;
DROP TABLE IF EXISTS ingestion_sources;

ALTER TABLE trips
  DROP FOREIGN KEY fk_trips_selected_variant,
  DROP COLUMN selected_variant_id;

DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS trip_days;
DROP TABLE IF EXISTS itinerary_variants;
DROP TABLE IF EXISTS travel_preferences;
