-- Pharmacy-suggested medicines: only APPROVED ones are stockable and searchable.
-- Existing rows are admin-created, hence APPROVED. pharmacies.id is binary(16).
ALTER TABLE `medicine_master`
  ADD COLUMN `status` varchar(20) NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN `suggested_by_pharmacy_id` binary(16) DEFAULT NULL,
  ADD COLUMN `rejection_reason` varchar(500) DEFAULT NULL,
  ADD CONSTRAINT `fk_medicine_suggested_by_pharmacy` FOREIGN KEY (`suggested_by_pharmacy_id`) REFERENCES `pharmacies` (`id`);
ALTER TABLE `medicine_master_aud`
  ADD COLUMN `status` varchar(20) DEFAULT NULL,
  ADD COLUMN `suggested_by_pharmacy_id` binary(16) DEFAULT NULL,
  ADD COLUMN `rejection_reason` varchar(500) DEFAULT NULL;
