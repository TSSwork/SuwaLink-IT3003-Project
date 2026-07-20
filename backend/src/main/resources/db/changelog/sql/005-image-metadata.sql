ALTER TABLE images
    ADD COLUMN original_filename VARCHAR(255) NOT NULL,
    ADD COLUMN generated_filename VARCHAR(255) NOT NULL,
    ADD COLUMN file_path VARCHAR(255) NOT NULL,
    ADD COLUMN mime_type VARCHAR(255) NOT NULL;
