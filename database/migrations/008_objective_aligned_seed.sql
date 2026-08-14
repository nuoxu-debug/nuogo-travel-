INSERT INTO supported_destinations
  (id, name_en, name_zh, center_latitude, center_longitude, status)
VALUES
  ('beijing', 'Beijing', 'Beijing', 39.9042000, 116.4074000, 'ACTIVE'),
  ('shanghai', 'Shanghai', 'Shanghai', 31.2304000, 121.4737000, 'ACTIVE'),
  ('xian', 'Xi''an', 'Xi''an', 34.3416000, 108.9398000, 'ACTIVE')
ON DUPLICATE KEY UPDATE
  name_en = VALUES(name_en),
  name_zh = VALUES(name_zh),
  center_latitude = VALUES(center_latitude),
  center_longitude = VALUES(center_longitude),
  status = VALUES(status);
