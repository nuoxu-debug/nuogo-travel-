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
    'groupType', 'friends',
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
  total_budget = VALUES(total_budget);

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
