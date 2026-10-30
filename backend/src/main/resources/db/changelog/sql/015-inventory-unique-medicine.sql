-- A pharmacy stocks each catalogue medicine once (the service guard returns a friendly 409 first).
-- The changeset precondition halts if duplicate pairs exist, rather than deleting stock silently.
ALTER TABLE `inventory`
  ADD CONSTRAINT `uk_inventory_pharmacy_medicine` UNIQUE (`pharmacy_id`, `medicine_master_id`);
