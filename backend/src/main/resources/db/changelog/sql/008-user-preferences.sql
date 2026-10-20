-- Per-user language preference (en/si/ta) and optional home district.
ALTER TABLE `users`
  ADD COLUMN `preferred_language` varchar(2) NOT NULL DEFAULT 'en',
  ADD COLUMN `district` varchar(20) DEFAULT NULL;
