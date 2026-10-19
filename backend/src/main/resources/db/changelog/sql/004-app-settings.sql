CREATE TABLE `app_settings` (
  `setting_key` varchar(64) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  `updated_at` datetime(6) NULL,
  PRIMARY KEY (`setting_key`)
);
INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES ('demo_mode_public', 'false');
