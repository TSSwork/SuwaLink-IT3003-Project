-- Dev data only (no production DB exists): existing requests have no target scope, consent or
-- expiry, so remove them and everything that references them before adding NOT NULL columns.
DELETE FROM `reservations` WHERE `prescription_response_item_id` IS NOT NULL;
DELETE FROM `prescription_response_items`;
DELETE FROM `prescription_responses`;
DELETE FROM `prescription_requests`;
ALTER TABLE `prescription_requests`
  ADD COLUMN `target_scope` varchar(20) NOT NULL,
  ADD COLUMN `latitude` decimal(9,6) NULL,
  ADD COLUMN `longitude` decimal(9,6) NULL,
  ADD COLUMN `district` varchar(20) NULL,
  ADD COLUMN `consent_at` datetime(6) NOT NULL,
  ADD COLUMN `expires_at` datetime(6) NOT NULL,
  MODIFY `status` enum('PENDING','RESPONDED','CLOSED','EXPIRED') NOT NULL;
CREATE INDEX `IDX_prescription_requests_status_expires` ON `prescription_requests` (`status`, `expires_at`);
CREATE TABLE `prescription_request_targets` (
  `request_id` binary(16) NOT NULL,
  `pharmacy_id` binary(16) NOT NULL,
  PRIMARY KEY (`request_id`, `pharmacy_id`),
  KEY `FK_presc_request_targets_pharmacy_id` (`pharmacy_id`),
  CONSTRAINT `FK_presc_request_targets_request_id` FOREIGN KEY (`request_id`) REFERENCES `prescription_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_presc_request_targets_pharmacy_id` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
