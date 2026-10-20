ALTER TABLE `pharmacies`
  ADD COLUMN `name` varchar(255) NULL,
  ADD COLUMN `phone` varchar(255) NULL,
  ADD COLUMN `district` varchar(20) NULL,
  ADD COLUMN `city` varchar(255) NULL,
  ADD COLUMN `latitude` decimal(9,6) NULL,
  ADD COLUMN `longitude` decimal(9,6) NULL,
  ADD COLUMN `opening_hours` varchar(255) NULL,
  ADD COLUMN `is_demo` bit(1) NOT NULL DEFAULT b'0';
UPDATE `pharmacies` p JOIN `users` u ON u.`id` = p.`user_id`
  SET p.`name` = u.`name`, p.`phone` = u.`phone`, p.`district` = 'COLOMBO', p.`city` = '',
      p.`latitude` = 6.927100, p.`longitude` = 79.861200;
ALTER TABLE `pharmacies`
  MODIFY `name` varchar(255) NOT NULL,
  MODIFY `phone` varchar(255) NOT NULL,
  MODIFY `district` varchar(20) NOT NULL,
  MODIFY `city` varchar(255) NOT NULL,
  MODIFY `latitude` decimal(9,6) NOT NULL,
  MODIFY `longitude` decimal(9,6) NOT NULL;
ALTER TABLE `users` ADD COLUMN `is_demo` bit(1) NOT NULL DEFAULT b'0';
