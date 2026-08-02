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
  CONSTRAINT `FK_presc_responses_request_id` FOREIGN KEY (`prescription_request_id`) REFERENCES `prescription_requests` (`id`),
  CONSTRAINT `FK_presc_responses_pharmacy_id` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`id`)
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
  CONSTRAINT `FK_response_items_response_id` FOREIGN KEY (`prescription_response_id`) REFERENCES `prescription_responses` (`id`),
  CONSTRAINT `FK_response_items_inventory_id` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
