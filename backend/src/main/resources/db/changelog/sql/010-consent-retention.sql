-- Terms/privacy consent timestamp (existing users are treated as having accepted at sign-up)
-- and when a prescription image file was purged by the retention job.
ALTER TABLE `users` ADD COLUMN `terms_accepted_at` datetime(6) NULL;
UPDATE `users` SET `terms_accepted_at` = COALESCE(`created_at`, CURRENT_TIMESTAMP(6));
ALTER TABLE `users` MODIFY COLUMN `terms_accepted_at` datetime(6) NOT NULL;
ALTER TABLE `images` ADD COLUMN `purged_at` datetime(6) DEFAULT NULL;
