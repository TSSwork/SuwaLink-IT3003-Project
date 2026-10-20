-- Admin suspension and account deletion by anonymisation (row kept, deleted_at set).
-- pharmacies.status is varchar(20), so the new DEACTIVATED value needs no schema change.
ALTER TABLE `users`
  ADD COLUMN `is_suspended` bit(1) NOT NULL DEFAULT b'0',
  ADD COLUMN `deleted_at` datetime(6) DEFAULT NULL;
