SET @cat_analgesics = UNHEX(REPLACE(UUID(), '-', ''));
SET @cat_antipyretics = UNHEX(REPLACE(UUID(), '-', ''));
SET @cat_antibiotics = UNHEX(REPLACE(UUID(), '-', ''));
SET @cat_antidiabetics = UNHEX(REPLACE(UUID(), '-', ''));
SET @cat_antihypertensives = UNHEX(REPLACE(UUID(), '-', ''));
SET @cat_gastrointestinal = UNHEX(REPLACE(UUID(), '-', ''));
SET @cat_respiratory = UNHEX(REPLACE(UUID(), '-', ''));
SET @cat_nutraceuticals = UNHEX(REPLACE(UUID(), '-', ''));

INSERT INTO categories (id, created_at, created_by, updated_at, updated_by, version, is_active, description, name, parent_id) VALUES
(@cat_analgesics, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 1, NULL, 'Analgesics', NULL),
(@cat_antipyretics, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 1, NULL, 'Antipyretics', NULL),
(@cat_antibiotics, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 1, NULL, 'Antibiotics', NULL),
(@cat_antidiabetics, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 1, NULL, 'Antidiabetics', NULL),
(@cat_antihypertensives, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 1, NULL, 'Antihypertensives', NULL),
(@cat_gastrointestinal, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 1, NULL, 'Gastrointestinal', NULL),
(@cat_respiratory, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 1, NULL, 'Respiratory', NULL),
(@cat_nutraceuticals, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 1, NULL, 'Nutraceuticals', NULL);

SET @mfr_gsk = UNHEX(REPLACE(UUID(), '-', ''));
SET @mfr_cipla = UNHEX(REPLACE(UUID(), '-', ''));
SET @mfr_spmc = UNHEX(REPLACE(UUID(), '-', ''));

INSERT INTO manufacturers (id, created_at, created_by, updated_at, updated_by, version, contact_email, country, is_active, license_number, name, phone) VALUES
(@mfr_gsk, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, NULL, 'United Kingdom', 1, NULL, 'GlaxoSmithKline', NULL),
(@mfr_cipla, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, NULL, 'India', 1, NULL, 'Cipla', NULL),
(@mfr_spmc, NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, NULL, 'Sri Lanka', 1, NULL, 'State Pharmaceuticals Manufacturing Corporation', NULL);

INSERT INTO medicine_master (id, created_at, created_by, updated_at, updated_by, version, brand_name, description, dosage_form, generic_name, image_url, legal_category, strength, unit_of_measure, manufacturer_id, therapeutic_category_id) VALUES
(UUID(), NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 'Panadol', NULL, 'Tablet', 'Paracetamol', NULL, 'OTC', '500mg', 'TABLET', @mfr_gsk, @cat_analgesics),
(UUID(), NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 'Amoxil', NULL, 'Capsule', 'Amoxicillin', NULL, 'PRESCRIPTION', '250mg', 'CAPSULE', @mfr_cipla, @cat_antibiotics),
(UUID(), NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 'Cee-Vitt', NULL, 'Tablet', 'Vitamin C', NULL, 'OTC', '500mg', 'TABLET', @mfr_spmc, @cat_nutraceuticals);
