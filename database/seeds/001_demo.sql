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
