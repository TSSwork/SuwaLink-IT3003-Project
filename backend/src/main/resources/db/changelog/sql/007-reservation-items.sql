-- Reservations become multi-line (reservation_items) with a pickup code and a hold expiry.
-- Dev data only (no production DB exists): existing single-item reservations cannot be given a
-- pickup code or expiry retroactively, so they are removed.
DELETE FROM `reservations`;
ALTER TABLE `reservations`
  DROP FOREIGN KEY `FK_reservations_inventory_id`,
  DROP FOREIGN KEY `FK_reservations_response_item_id`;
ALTER TABLE `reservations`
  DROP INDEX `FK_reservations_inventory_id`,
  DROP INDEX `FK_reservations_response_item_id`,
  DROP COLUMN `inventory_id`,
  DROP COLUMN `prescription_response_item_id`,
  DROP COLUMN `quantity`,
  DROP COLUMN `unit_price`,
  ADD COLUMN `pickup_code` varchar(10) NOT NULL,
  ADD COLUMN `expires_at` datetime(6) NOT NULL,
  ADD COLUMN `cancelled_by` enum('PATIENT','PHARMACY') DEFAULT NULL,
  ADD COLUMN `prescription_request_id` binary(16) DEFAULT NULL,
  ADD COLUMN `is_demo` bit(1) NOT NULL DEFAULT b'0',
  MODIFY `status` enum('CONFIRMED','CANCELLED','COMPLETED','EXPIRED') NOT NULL,
  ADD CONSTRAINT `UK_reservations_pickup_code` UNIQUE (`pickup_code`),
  ADD KEY `FK_reservations_prescription_request_id` (`prescription_request_id`),
  ADD CONSTRAINT `FK_reservations_prescription_request_id`
    FOREIGN KEY (`prescription_request_id`) REFERENCES `prescription_requests` (`id`);
CREATE TABLE `reservation_items` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL,
  `reservation_id` binary(16) NOT NULL,
  `inventory_id` binary(16) NOT NULL,
  `prescription_response_item_id` binary(16) DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `medicine_name` varchar(255) NOT NULL,
  `requires_prescription` bit(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_reservation_items_reservation_id` (`reservation_id`),
  KEY `FK_reservation_items_inventory_id` (`inventory_id`),
  KEY `FK_reservation_items_response_item_id` (`prescription_response_item_id`),
  CONSTRAINT `FK_reservation_items_reservation_id` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`),
  CONSTRAINT `FK_reservation_items_inventory_id` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`),
  CONSTRAINT `FK_reservation_items_response_item_id` FOREIGN KEY (`prescription_response_item_id`) REFERENCES `prescription_response_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
