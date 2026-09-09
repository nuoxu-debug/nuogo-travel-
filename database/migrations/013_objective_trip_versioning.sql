ALTER TABLE trips
  ADD COLUMN parent_trip_id CHAR(36) NULL AFTER user_id,
  ADD CONSTRAINT fk_trips_parent_trip
    FOREIGN KEY (parent_trip_id) REFERENCES trips(id) ON DELETE SET NULL,
  ADD INDEX idx_trips_parent_trip (parent_trip_id);
