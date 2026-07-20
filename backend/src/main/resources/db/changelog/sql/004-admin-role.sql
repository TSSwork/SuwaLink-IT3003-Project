ALTER TABLE users MODIFY COLUMN role ENUM('CUSTOMER','PHARMACY_ADMIN','ADMIN') NOT NULL;

INSERT INTO users (id, name, email, phone, password, role, created_at, created_by, updated_at)
VALUES (
    UNHEX(REPLACE(UUID(), '-', '')),
    'SuwaLink Admin',
    'admin@suwalink.local',
    '0000000000',
    '{bcrypt}$2a$10$YmvcGqPnTXB4I5GIKumhBu.FC91RqJdqE.zR09xUOQCgKoNgHS/V6',
    'ADMIN',
    NOW(6),
    'SYSTEM',
    NOW(6)
);
