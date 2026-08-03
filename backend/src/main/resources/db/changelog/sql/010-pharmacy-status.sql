ALTER TABLE `pharmacies`
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING';

UPDATE `pharmacies` SET `status` = 'VERIFIED' WHERE `is_verified` = 1;

ALTER TABLE `pharmacies`
  DROP COLUMN `is_verified`;
