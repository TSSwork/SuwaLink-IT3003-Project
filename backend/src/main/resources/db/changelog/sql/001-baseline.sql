-- Schema baseline: squash of the original migrations 001-011 (mysqldump --no-data from MySQL 8).
-- Tables are listed alphabetically, so foreign key checks are off while they are created.
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `bookmarks` (
  `id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `inventory_id` binary(16) NOT NULL,
  `version` bigint DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bookmark_user_inventory` (`user_id`,`inventory_id`),
  KEY `fk_bookmark_inventory` (`inventory_id`),
  CONSTRAINT `fk_bookmark_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`),
  CONSTRAINT `fk_bookmark_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `bookmarks_aud` (
  `id` binary(16) NOT NULL,
  `rev` int NOT NULL,
  `revtype` tinyint DEFAULT NULL,
  `user_id` binary(16) DEFAULT NULL,
  `inventory_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`,`rev`),
  KEY `fk_bookmarks_aud_rev` (`rev`),
  CONSTRAINT `fk_bookmarks_aud_rev` FOREIGN KEY (`rev`) REFERENCES `revinfo` (`rev`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `categories` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL,
  `is_active` bit(1) NOT NULL,
  `description` text,
  `name` varchar(255) NOT NULL,
  `parent_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKt8o6pivur7nn124jehx7cygw5` (`name`),
  KEY `FKsaok720gsu4u2wrgbk10b5n8d` (`parent_id`),
  CONSTRAINT `FKsaok720gsu4u2wrgbk10b5n8d` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `categories_aud` (
  `id` binary(16) NOT NULL,
  `rev` int NOT NULL,
  `revtype` tinyint DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `description` text,
  `name` varchar(255) DEFAULT NULL,
  `parent_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`rev`,`id`),
  CONSTRAINT `FK6ti58h8w0q47oacscu06hcite` FOREIGN KEY (`rev`) REFERENCES `revinfo` (`rev`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `images` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `image_type` enum('INVENTORY','PROFILE','PRESCRIPTION') NOT NULL,
  `url` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `generated_filename` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `mime_type` varchar(255) NOT NULL,
  `uploaded_by_user_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_images_uploaded_by_user` (`uploaded_by_user_id`),
  CONSTRAINT `fk_images_uploaded_by_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `inventory` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL,
  `currency` enum('LKR') NOT NULL,
  `expire_date` date NOT NULL,
  `stock_quantity` int NOT NULL,
  `unit_price` decimal(38,2) NOT NULL,
  `image_id` binary(16) DEFAULT NULL,
  `medicine_master_id` varchar(36) NOT NULL,
  `pharmacy_id` binary(16) NOT NULL,
  `available` bit(1) NOT NULL DEFAULT b'1',
  PRIMARY KEY (`id`),
  KEY `FK6o5x9e0o8c4l7fysha9vi87tp` (`image_id`),
  KEY `FK6bcw8r5y5adaxkk1r9sr2r20k` (`medicine_master_id`),
  KEY `FKt7fktnrew3w9ldo63oub8xh23` (`pharmacy_id`),
  CONSTRAINT `FK6bcw8r5y5adaxkk1r9sr2r20k` FOREIGN KEY (`medicine_master_id`) REFERENCES `medicine_master` (`id`),
  CONSTRAINT `FK6o5x9e0o8c4l7fysha9vi87tp` FOREIGN KEY (`image_id`) REFERENCES `images` (`id`),
  CONSTRAINT `FKt7fktnrew3w9ldo63oub8xh23` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `inventory_aud` (
  `id` binary(16) NOT NULL,
  `rev` int NOT NULL,
  `revtype` tinyint DEFAULT NULL,
  `currency` enum('LKR') DEFAULT NULL,
  `expire_date` date DEFAULT NULL,
  `stock_quantity` int DEFAULT NULL,
  `unit_price` decimal(38,2) DEFAULT NULL,
  `image_id` binary(16) DEFAULT NULL,
  `medicine_master_id` varchar(36) DEFAULT NULL,
  `pharmacy_id` binary(16) DEFAULT NULL,
  `available` bit(1) DEFAULT NULL,
  PRIMARY KEY (`rev`,`id`),
  CONSTRAINT `FK75do9k0r3ovcdn26py7pf9p2r` FOREIGN KEY (`rev`) REFERENCES `revinfo` (`rev`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `manufacturers` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `country` varchar(255) NOT NULL,
  `is_active` bit(1) NOT NULL,
  `license_number` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKrgruuf4bdtokowdxk169bs8op` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `manufacturers_aud` (
  `id` binary(16) NOT NULL,
  `rev` int NOT NULL,
  `revtype` tinyint DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `license_number` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`rev`,`id`),
  CONSTRAINT `FKc1f0121xrjjq9oe4vi6s22mdy` FOREIGN KEY (`rev`) REFERENCES `revinfo` (`rev`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `medicine_master` (
  `id` varchar(36) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL,
  `brand_name` varchar(255) NOT NULL,
  `description` text,
  `dosage_form` varchar(255) NOT NULL,
  `generic_name` varchar(255) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `legal_category` enum('CONTROLLED','OTC','PRESCRIPTION','SCHEDULE_III') NOT NULL,
  `strength` varchar(255) NOT NULL,
  `unit_of_measure` enum('BOTTLE','CAPSULE','G','MG','ML','STRIP','TABLET','TUBE','VIAL') NOT NULL,
  `manufacturer_id` binary(16) NOT NULL,
  `therapeutic_category_id` binary(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK7t8h6ykhxexnd6q6w2etvg9u7` (`manufacturer_id`),
  KEY `FKb6hgp5vasgqkj3xpgugiu6dtj` (`therapeutic_category_id`),
  CONSTRAINT `FK7t8h6ykhxexnd6q6w2etvg9u7` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers` (`id`),
  CONSTRAINT `FKb6hgp5vasgqkj3xpgugiu6dtj` FOREIGN KEY (`therapeutic_category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `medicine_master_aud` (
  `id` varchar(36) NOT NULL,
  `rev` int NOT NULL,
  `revtype` tinyint DEFAULT NULL,
  `brand_name` varchar(255) DEFAULT NULL,
  `description` text,
  `dosage_form` varchar(255) DEFAULT NULL,
  `generic_name` varchar(255) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `legal_category` enum('CONTROLLED','OTC','PRESCRIPTION','SCHEDULE_III') DEFAULT NULL,
  `strength` varchar(255) DEFAULT NULL,
  `unit_of_measure` enum('BOTTLE','CAPSULE','G','MG','ML','STRIP','TABLET','TUBE','VIAL') DEFAULT NULL,
  `manufacturer_id` binary(16) DEFAULT NULL,
  `therapeutic_category_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`rev`,`id`),
  CONSTRAINT `FKkra35jprm9kqckl43xw2fc8sb` FOREIGN KEY (`rev`) REFERENCES `revinfo` (`rev`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `recipient_id` binary(16) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `version` bigint NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_notification_recipient` (`recipient_id`),
  CONSTRAINT `fk_notification_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `notifications_aud` (
  `id` varchar(36) NOT NULL,
  `rev` int NOT NULL,
  `revtype` tinyint DEFAULT NULL,
  `recipient_id` binary(16) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `type` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`,`rev`),
  KEY `fk_notification_aud_rev` (`rev`),
  CONSTRAINT `fk_notification_aud_rev` FOREIGN KEY (`rev`) REFERENCES `revinfo` (`rev`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `pharmacies` (
  `id` binary(16) NOT NULL,
  `address` varchar(255) NOT NULL,
  `licence_no` varchar(255) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKsg5ac2kh6jvke0jtt6dgx4pc7` (`licence_no`),
  UNIQUE KEY `UKidb4iqtyt8vw86ngjh6scj3qp` (`user_id`),
  CONSTRAINT `FKmetjb871tcig2ijxurh7qop5b` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `prescription_requests` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL,
  `patient_age` int NOT NULL,
  `note` text,
  `status` enum('PENDING','RESPONDED','CLOSED') NOT NULL,
  `image_id` binary(16) NOT NULL,
  `patient_id` binary(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_prescription_requests_image_id` (`image_id`),
  KEY `FK_prescription_requests_patient_id` (`patient_id`),
  CONSTRAINT `FK_prescription_requests_image_id` FOREIGN KEY (`image_id`) REFERENCES `images` (`id`),
  CONSTRAINT `FK_prescription_requests_patient_id` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `prescription_response_items` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(38,2) NOT NULL,
  `prescription_response_id` binary(16) NOT NULL,
  `inventory_id` binary(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_response_items_response_id` (`prescription_response_id`),
  KEY `FK_response_items_inventory_id` (`inventory_id`),
  CONSTRAINT `FK_response_items_inventory_id` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`),
  CONSTRAINT `FK_response_items_response_id` FOREIGN KEY (`prescription_response_id`) REFERENCES `prescription_responses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `prescription_responses` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL,
  `message` text,
  `prescription_request_id` binary(16) NOT NULL,
  `pharmacy_id` binary(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_presc_responses_request_id` (`prescription_request_id`),
  KEY `FK_presc_responses_pharmacy_id` (`pharmacy_id`),
  CONSTRAINT `FK_presc_responses_pharmacy_id` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`id`),
  CONSTRAINT `FK_presc_responses_request_id` FOREIGN KEY (`prescription_request_id`) REFERENCES `prescription_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `reservations` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(38,2) NOT NULL,
  `status` enum('CONFIRMED','CANCELLED','COMPLETED') NOT NULL,
  `cancel_reason` varchar(255) DEFAULT NULL,
  `patient_id` binary(16) NOT NULL,
  `pharmacy_id` binary(16) NOT NULL,
  `inventory_id` binary(16) NOT NULL,
  `prescription_response_item_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_reservations_patient_id` (`patient_id`),
  KEY `FK_reservations_pharmacy_id` (`pharmacy_id`),
  KEY `FK_reservations_inventory_id` (`inventory_id`),
  KEY `FK_reservations_response_item_id` (`prescription_response_item_id`),
  CONSTRAINT `FK_reservations_inventory_id` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`),
  CONSTRAINT `FK_reservations_patient_id` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_reservations_pharmacy_id` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`id`),
  CONSTRAINT `FK_reservations_response_item_id` FOREIGN KEY (`prescription_response_item_id`) REFERENCES `prescription_response_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `revinfo` (
  `rev` int NOT NULL AUTO_INCREMENT,
  `revtstmp` bigint DEFAULT NULL,
  PRIMARY KEY (`rev`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `users` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `role` enum('CUSTOMER','PHARMACY_OWNER','ADMIN') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `reset_otp` varchar(6) DEFAULT NULL,
  `reset_otp_expiry` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK6dotkott2kjsp8vw4d0m25fb7` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
