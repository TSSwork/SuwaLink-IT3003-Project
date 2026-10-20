-- Reference catalog: medicines commonly sold in Sri Lankan pharmacies. Real reference data, kept in
-- production (not demo data). Every insert is guarded by name (categories, manufacturers) or by
-- brand + strength (medicines), so rows that already exist (e.g. from 002) are left alone.

INSERT INTO categories (id, created_at, created_by, updated_at, updated_by, version, is_active, description, name, parent_id)
SELECT UNHEX(REPLACE(UUID(), '-', '')), NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, 1, NULL, v.name, NULL
FROM (
  SELECT 'Antihistamines' AS name
  UNION ALL SELECT 'Lipid-lowering agents'
  UNION ALL SELECT 'Dermatologicals'
  UNION ALL SELECT 'Corticosteroids'
) v
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = v.name);

INSERT INTO manufacturers (id, created_at, created_by, updated_at, updated_by, version, contact_email, country, is_active, license_number, name, phone)
SELECT UNHEX(REPLACE(UUID(), '-', '')), NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, NULL, v.country, 1, NULL, v.name, NULL
FROM (
  SELECT 'Sun Pharmaceutical Industries' AS name, 'India' AS country
  UNION ALL SELECT 'Pfizer', 'United States'
  UNION ALL SELECT 'Abbott', 'United States'
  UNION ALL SELECT 'Merck', 'Germany'
  UNION ALL SELECT 'Sanofi', 'France'
  UNION ALL SELECT 'Servier', 'France'
  UNION ALL SELECT 'AstraZeneca', 'United Kingdom'
  UNION ALL SELECT 'Reckitt', 'United Kingdom'
  UNION ALL SELECT 'Janssen', 'Belgium'
  UNION ALL SELECT 'Bayer', 'Germany'
) v
WHERE NOT EXISTS (SELECT 1 FROM manufacturers m WHERE m.name = v.name);

INSERT INTO medicine_master (id, created_at, created_by, updated_at, updated_by, version, brand_name, description, dosage_form, generic_name, image_url, legal_category, strength, unit_of_measure, manufacturer_id, therapeutic_category_id, status)
SELECT UUID(), NOW(6), 'SYSTEM', NOW(6), 'SYSTEM', 0, v.brand, NULL, v.form, v.generic, NULL, v.legal, v.strength, v.unit, m.id, c.id, 'APPROVED'
FROM (
  SELECT 'Panadol Extra' AS brand, 'Paracetamol + Caffeine' AS generic, 'Tablet' AS form, '500mg/65mg' AS strength, 'TABLET' AS unit, 'OTC' AS legal, 'GlaxoSmithKline' AS mfr, 'Analgesics' AS cat
  UNION ALL SELECT 'Panadol Paediatric', 'Paracetamol', 'Oral suspension', '120mg/5ml', 'BOTTLE', 'OTC', 'GlaxoSmithKline', 'Antipyretics'
  UNION ALL SELECT 'Paracetamol', 'Paracetamol', 'Tablet', '500mg', 'TABLET', 'OTC', 'State Pharmaceuticals Manufacturing Corporation', 'Antipyretics'
  UNION ALL SELECT 'Brufen', 'Ibuprofen', 'Tablet', '400mg', 'TABLET', 'OTC', 'Abbott', 'Analgesics'
  UNION ALL SELECT 'Ponstan', 'Mefenamic acid', 'Capsule', '250mg', 'CAPSULE', 'PRESCRIPTION', 'Pfizer', 'Analgesics'
  UNION ALL SELECT 'Diclofenac Sodium', 'Diclofenac sodium', 'Tablet', '50mg', 'TABLET', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Analgesics'
  UNION ALL SELECT 'Voltaren Emulgel', 'Diclofenac diethylamine', 'Gel', '1% (20g)', 'TUBE', 'OTC', 'GlaxoSmithKline', 'Analgesics'
  UNION ALL SELECT 'Piriton', 'Chlorphenamine maleate', 'Tablet', '4mg', 'TABLET', 'OTC', 'GlaxoSmithKline', 'Antihistamines'
  UNION ALL SELECT 'Alerid', 'Cetirizine', 'Tablet', '10mg', 'TABLET', 'OTC', 'Cipla', 'Antihistamines'
  UNION ALL SELECT 'Loratadine', 'Loratadine', 'Tablet', '10mg', 'TABLET', 'OTC', 'State Pharmaceuticals Manufacturing Corporation', 'Antihistamines'
  UNION ALL SELECT 'Augmentin', 'Amoxicillin + Clavulanic acid', 'Tablet', '625mg', 'TABLET', 'PRESCRIPTION', 'GlaxoSmithKline', 'Antibiotics'
  UNION ALL SELECT 'Amoxicillin', 'Amoxicillin', 'Capsule', '500mg', 'CAPSULE', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Antibiotics'
  UNION ALL SELECT 'Azee', 'Azithromycin', 'Tablet', '500mg', 'TABLET', 'PRESCRIPTION', 'Cipla', 'Antibiotics'
  UNION ALL SELECT 'Ciplox', 'Ciprofloxacin', 'Tablet', '500mg', 'TABLET', 'PRESCRIPTION', 'Cipla', 'Antibiotics'
  UNION ALL SELECT 'Flagyl', 'Metronidazole', 'Tablet', '400mg', 'TABLET', 'PRESCRIPTION', 'Sanofi', 'Antibiotics'
  UNION ALL SELECT 'Cephalexin', 'Cephalexin', 'Capsule', '500mg', 'CAPSULE', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Antibiotics'
  UNION ALL SELECT 'Glucophage', 'Metformin hydrochloride', 'Tablet', '500mg', 'TABLET', 'PRESCRIPTION', 'Merck', 'Antidiabetics'
  UNION ALL SELECT 'Metformin', 'Metformin hydrochloride', 'Tablet', '500mg', 'TABLET', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Antidiabetics'
  UNION ALL SELECT 'Diamicron MR', 'Gliclazide', 'Modified-release tablet', '60mg', 'TABLET', 'PRESCRIPTION', 'Servier', 'Antidiabetics'
  UNION ALL SELECT 'Losartan Potassium', 'Losartan potassium', 'Tablet', '50mg', 'TABLET', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Antihypertensives'
  UNION ALL SELECT 'Norvasc', 'Amlodipine', 'Tablet', '5mg', 'TABLET', 'PRESCRIPTION', 'Pfizer', 'Antihypertensives'
  UNION ALL SELECT 'Amlodipine', 'Amlodipine', 'Tablet', '5mg', 'TABLET', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Antihypertensives'
  UNION ALL SELECT 'Atenolol', 'Atenolol', 'Tablet', '50mg', 'TABLET', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Antihypertensives'
  UNION ALL SELECT 'Enalapril', 'Enalapril maleate', 'Tablet', '5mg', 'TABLET', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Antihypertensives'
  UNION ALL SELECT 'Lipitor', 'Atorvastatin', 'Tablet', '10mg', 'TABLET', 'PRESCRIPTION', 'Pfizer', 'Lipid-lowering agents'
  UNION ALL SELECT 'Atorvastatin', 'Atorvastatin', 'Tablet', '20mg', 'TABLET', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Lipid-lowering agents'
  UNION ALL SELECT 'Rosuvas', 'Rosuvastatin', 'Tablet', '10mg', 'TABLET', 'PRESCRIPTION', 'Sun Pharmaceutical Industries', 'Lipid-lowering agents'
  UNION ALL SELECT 'Omeprazole', 'Omeprazole', 'Capsule', '20mg', 'CAPSULE', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Gastrointestinal'
  UNION ALL SELECT 'Nexium', 'Esomeprazole', 'Tablet', '40mg', 'TABLET', 'PRESCRIPTION', 'AstraZeneca', 'Gastrointestinal'
  UNION ALL SELECT 'Motilium', 'Domperidone', 'Tablet', '10mg', 'TABLET', 'PRESCRIPTION', 'Janssen', 'Gastrointestinal'
  UNION ALL SELECT 'Gaviscon', 'Sodium alginate + Sodium bicarbonate + Calcium carbonate', 'Oral liquid', '150ml', 'BOTTLE', 'OTC', 'Reckitt', 'Gastrointestinal'
  UNION ALL SELECT 'Imodium', 'Loperamide', 'Capsule', '2mg', 'CAPSULE', 'OTC', 'Janssen', 'Gastrointestinal'
  UNION ALL SELECT 'Buscopan', 'Hyoscine butylbromide', 'Tablet', '10mg', 'TABLET', 'OTC', 'Sanofi', 'Gastrointestinal'
  UNION ALL SELECT 'Jeewani', 'Oral rehydration salts', 'Sachet', '20.5g', 'STRIP', 'OTC', 'State Pharmaceuticals Manufacturing Corporation', 'Gastrointestinal'
  UNION ALL SELECT 'Ventolin Inhaler', 'Salbutamol', 'Inhaler', '100mcg/dose', 'BOTTLE', 'PRESCRIPTION', 'GlaxoSmithKline', 'Respiratory'
  UNION ALL SELECT 'Seretide Evohaler', 'Salmeterol + Fluticasone propionate', 'Inhaler', '25mcg/250mcg', 'BOTTLE', 'PRESCRIPTION', 'GlaxoSmithKline', 'Respiratory'
  UNION ALL SELECT 'Salbutamol Syrup', 'Salbutamol', 'Syrup', '2mg/5ml', 'BOTTLE', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Respiratory'
  UNION ALL SELECT 'Montair', 'Montelukast', 'Tablet', '10mg', 'TABLET', 'PRESCRIPTION', 'Cipla', 'Respiratory'
  UNION ALL SELECT 'Strepsils', 'Amylmetacresol + Dichlorobenzyl alcohol', 'Lozenge', '0.6mg/1.2mg', 'TABLET', 'OTC', 'Reckitt', 'Respiratory'
  UNION ALL SELECT 'Limcee', 'Ascorbic acid (Vitamin C)', 'Chewable tablet', '500mg', 'TABLET', 'OTC', 'Abbott', 'Nutraceuticals'
  UNION ALL SELECT 'Caltrate', 'Calcium carbonate + Vitamin D3', 'Tablet', '600mg/400IU', 'TABLET', 'OTC', 'Pfizer', 'Nutraceuticals'
  UNION ALL SELECT 'Ferrous Sulphate + Folic Acid', 'Ferrous sulphate + Folic acid', 'Tablet', '200mg/0.4mg', 'TABLET', 'OTC', 'State Pharmaceuticals Manufacturing Corporation', 'Nutraceuticals'
  UNION ALL SELECT 'Folic Acid', 'Folic acid', 'Tablet', '5mg', 'TABLET', 'OTC', 'State Pharmaceuticals Manufacturing Corporation', 'Nutraceuticals'
  UNION ALL SELECT 'Revital H', 'Multivitamin + Minerals + Ginseng', 'Capsule', '1 capsule', 'CAPSULE', 'OTC', 'Sun Pharmaceutical Industries', 'Nutraceuticals'
  UNION ALL SELECT 'Betnovate', 'Betamethasone valerate', 'Cream', '0.1% (15g)', 'TUBE', 'PRESCRIPTION', 'GlaxoSmithKline', 'Dermatologicals'
  UNION ALL SELECT 'Canesten', 'Clotrimazole', 'Cream', '1% (20g)', 'TUBE', 'OTC', 'Bayer', 'Dermatologicals'
  UNION ALL SELECT 'Prednisolone', 'Prednisolone', 'Tablet', '5mg', 'TABLET', 'PRESCRIPTION', 'State Pharmaceuticals Manufacturing Corporation', 'Corticosteroids'
) v
JOIN manufacturers m ON m.name = v.mfr
JOIN categories c ON c.name = v.cat
WHERE NOT EXISTS (SELECT 1 FROM medicine_master mm WHERE mm.brand_name = v.brand AND mm.strength = v.strength);
