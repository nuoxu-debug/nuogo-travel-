USE nuogo;

-- Local presentation account. Password: Nuogo123!
INSERT INTO users (id, name, email, password_hash)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Nuogo Demo Student',
  'student@nuogo.test',
  '$2a$12$KRrFGLv./O7wusl06su6vuD2LT7yl3Yk27ZdKvrALVSm7EEQDddMq'
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Data-only collaborators for the deterministic group-expense demo.
-- No plaintext password, live invitation token, or external credential is seeded.
INSERT INTO users (id, name, email, password_hash)
VALUES
  (
    '00000000-0000-4000-8000-000000000002',
    'Li Wei',
    'editor@nuogo.test',
    '$2a$12$000000000000000000000u000000000000000000000000000000'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Wang Min',
    'viewer@nuogo.test',
    '$2a$12$000000000000000000000u000000000000000000000000000000'
  )
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO trips (
  id,
  user_id,
  status,
  title_en,
  title_zh,
  destination,
  start_date,
  end_date,
  total_budget,
  selected_variant_id,
  preferences_json,
  revision
)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'upcoming',
  'Huangshan collaboration demo',
  '黄山协作演示行程',
  'huangshan',
  '2026-08-10',
  '2026-08-13',
  4800.00,
  NULL,
  JSON_OBJECT(
    'destination', 'huangshan',
    'departureCity', 'shanghai',
    'days', 4,
    'totalBudget', 4800,
    'interests', JSON_ARRAY('natural_scenery', 'local_street_food'),
    'groupType', 'student_group',
    'accommodation', 'budget_hotel',
    'language', 'zh',
    'startDate', '2026-08-10'
  ),
  0
)
ON DUPLICATE KEY UPDATE
  title_en = VALUES(title_en),
  title_zh = VALUES(title_zh),
  status = VALUES(status),
  destination = VALUES(destination),
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  total_budget = VALUES(total_budget),
  preferences_json = VALUES(preferences_json);

INSERT INTO itinerary_variants (
  id,
  trip_id,
  style,
  title_json,
  summary_json,
  pace,
  highlights_json,
  budget_json,
  is_fallback
)
VALUES (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'budget',
  JSON_OBJECT('en', 'Huangshan shared escape', 'zh', '黄山结伴轻旅行'),
  JSON_OBJECT(
    'en', 'A practical Huangshan route prepared for the collaboration and expense demo.',
    'zh', '为协作规划与分摊费用演示准备的黄山实用路线。'
  ),
  'balanced',
  JSON_OBJECT(
    'en', JSON_ARRAY('Huangshan scenic area', 'Shared group planning'),
    'zh', JSON_ARRAY('黄山风景区', '多人协作规划')
  ),
  JSON_OBJECT(
    'scenicTickets', 380,
    'localFood', 420,
    'transportation', 600,
    'accommodation', 1200
  ),
  FALSE
)
ON DUPLICATE KEY UPDATE
  trip_id = VALUES(trip_id),
  style = VALUES(style),
  title_json = VALUES(title_json),
  summary_json = VALUES(summary_json),
  pace = VALUES(pace),
  highlights_json = VALUES(highlights_json),
  budget_json = VALUES(budget_json),
  is_fallback = VALUES(is_fallback);

INSERT INTO trip_days (id, variant_id, day_number, trip_date, title_json)
VALUES (
  '12000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  1,
  '2026-08-10',
  JSON_OBJECT('en', 'Meet Huangshan', 'zh', '初见黄山')
)
ON DUPLICATE KEY UPDATE
  variant_id = VALUES(variant_id),
  day_number = VALUES(day_number),
  trip_date = VALUES(trip_date),
  title_json = VALUES(title_json);

INSERT INTO activities (
  id,
  day_id,
  sort_order,
  start_time,
  end_time,
  name_json,
  description_json,
  category,
  address_json,
  longitude,
  latitude,
  estimated_cost,
  transport_note_json,
  guide_json,
  source_attraction_id,
  source_provider,
  source_url,
  image_url,
  image_attribution,
  visit_details_json,
  location_is_estimated,
  vote_count
)
VALUES (
  '13000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  0,
  '09:00:00',
  '12:00:00',
  JSON_OBJECT('en', 'Huangshan Scenic Area', 'zh', '黄山风景区'),
  JSON_OBJECT(
    'en', 'Begin the shared trip with a scenic walk near the southern entrance.',
    'zh', '从南大门附近开始结伴游览黄山。'
  ),
  'natural_scenery',
  JSON_OBJECT('en', 'Tangkou Town, Huangshan', 'zh', '黄山市汤口镇'),
  118.1683000,
  30.1302000,
  190.00,
  JSON_OBJECT(
    'en', 'Meet at the hotel and use the scenic shuttle together.',
    'zh', '在酒店集合后共同乘坐景区换乘车。'
  ),
  JSON_OBJECT(
    'culture', JSON_OBJECT('en', 'Respect marked mountain paths.', 'zh', '请遵守景区步道指引。'),
    'food', JSON_OBJECT('en', 'Carry water and a light snack.', 'zh', '建议携带饮用水和轻食。'),
    'crowd', JSON_OBJECT('en', 'Start early to avoid peak queues.', 'zh', '尽早出发可避开高峰排队。'),
    'visit', JSON_OBJECT('en', 'Wear shoes with reliable grip.', 'zh', '建议穿着防滑的步行鞋。')
  ),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  FALSE,
  0
)
ON DUPLICATE KEY UPDATE
  day_id = VALUES(day_id),
  sort_order = VALUES(sort_order),
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  name_json = VALUES(name_json),
  description_json = VALUES(description_json),
  category = VALUES(category),
  address_json = VALUES(address_json),
  longitude = VALUES(longitude),
  latitude = VALUES(latitude),
  estimated_cost = VALUES(estimated_cost),
  transport_note_json = VALUES(transport_note_json),
  guide_json = VALUES(guide_json),
  source_attraction_id = VALUES(source_attraction_id),
  source_provider = VALUES(source_provider),
  source_url = VALUES(source_url),
  image_url = VALUES(image_url),
  image_attribution = VALUES(image_attribution),
  visit_details_json = VALUES(visit_details_json),
  location_is_estimated = VALUES(location_is_estimated),
  vote_count = VALUES(vote_count);

UPDATE trips
SET selected_variant_id = '11000000-0000-4000-8000-000000000001'
WHERE id = '10000000-0000-4000-8000-000000000001';

INSERT INTO trip_members (id, trip_id, user_id, role, status, removed_at)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'owner',
    'active',
    NULL
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    'editor',
    'active',
    NULL
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000003',
    'viewer',
    'active',
    NULL
  )
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  status = VALUES(status),
  removed_at = VALUES(removed_at);

INSERT INTO trip_expenses (
  id,
  trip_id,
  description,
  category,
  amount_fen,
  expense_date,
  paid_by_user_id,
  created_by_user_id,
  note
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Hongcun shared lunch',
    'food',
    30000,
    '2026-08-10',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Owner and editor only; viewer did not join this meal.'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Huangshan station transfer',
    'transportation',
    12000,
    '2026-08-10',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Shared by all three travellers.'
  )
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  category = VALUES(category),
  amount_fen = VALUES(amount_fen),
  expense_date = VALUES(expense_date),
  paid_by_user_id = VALUES(paid_by_user_id),
  created_by_user_id = VALUES(created_by_user_id),
  note = VALUES(note);

DELETE FROM expense_participants
WHERE expense_id IN (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002'
);

INSERT INTO expense_participants (expense_id, user_id, share_fen)
VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    15000
  ),
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    15000
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    4000
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    4000
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    4000
  );
