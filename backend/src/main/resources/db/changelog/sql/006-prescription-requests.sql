ALTER TABLE images MODIFY COLUMN image_type ENUM('INVENTORY','PROFILE','PRESCRIPTION') NOT NULL;

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
