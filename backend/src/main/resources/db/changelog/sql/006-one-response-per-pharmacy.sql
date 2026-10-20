-- A pharmacy gets one (editable) response per prescription request. Dev data only: drop duplicates,
-- keeping the newest response per (request, pharmacy), before adding the unique constraint.
DELETE res FROM `reservations` res
  JOIN `prescription_response_items` i ON i.`id` = res.`prescription_response_item_id`
  JOIN `prescription_responses` r ON r.`id` = i.`prescription_response_id`
  JOIN `prescription_responses` newer
    ON newer.`prescription_request_id` = r.`prescription_request_id`
   AND newer.`pharmacy_id` = r.`pharmacy_id`
   AND (newer.`created_at` > r.`created_at` OR (newer.`created_at` = r.`created_at` AND newer.`id` > r.`id`));
DELETE i FROM `prescription_response_items` i
  JOIN `prescription_responses` r ON r.`id` = i.`prescription_response_id`
  JOIN `prescription_responses` newer
    ON newer.`prescription_request_id` = r.`prescription_request_id`
   AND newer.`pharmacy_id` = r.`pharmacy_id`
   AND (newer.`created_at` > r.`created_at` OR (newer.`created_at` = r.`created_at` AND newer.`id` > r.`id`));
DELETE r FROM `prescription_responses` r
  JOIN `prescription_responses` newer
    ON newer.`prescription_request_id` = r.`prescription_request_id`
   AND newer.`pharmacy_id` = r.`pharmacy_id`
   AND (newer.`created_at` > r.`created_at` OR (newer.`created_at` = r.`created_at` AND newer.`id` > r.`id`));
ALTER TABLE `prescription_responses`
  ADD CONSTRAINT `UK_presc_responses_request_pharmacy` UNIQUE (`prescription_request_id`, `pharmacy_id`);
