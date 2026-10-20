-- Notifications store a message key + JSON params (rendered per reader language) instead of fixed
-- English title/message text, plus a frontend link and when the email went out.
-- Dev data only (no production DB exists): old free-text notifications have no key, so they are removed.
DELETE FROM `notifications`;
DELETE FROM `notifications_aud`;
ALTER TABLE `notifications`
  DROP COLUMN `title`,
  DROP COLUMN `message`,
  ADD COLUMN `message_key` varchar(100) NOT NULL,
  ADD COLUMN `params` text NOT NULL DEFAULT ('{}'),
  ADD COLUMN `link` varchar(255) DEFAULT NULL,
  ADD COLUMN `emailed_at` datetime(6) DEFAULT NULL;
ALTER TABLE `notifications_aud`
  DROP COLUMN `title`,
  DROP COLUMN `message`,
  ADD COLUMN `message_key` varchar(100) DEFAULT NULL,
  ADD COLUMN `params` text,
  ADD COLUMN `link` varchar(255) DEFAULT NULL,
  ADD COLUMN `emailed_at` datetime(6) DEFAULT NULL;
