ALTER TABLE `images`
  ADD COLUMN `uploaded_by_user_id` BINARY(16) DEFAULT NULL,
  ADD CONSTRAINT `fk_images_uploaded_by_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`);
