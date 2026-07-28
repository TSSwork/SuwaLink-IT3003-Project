CREATE TABLE bookmarks (
                           id BINARY(16) NOT NULL,
                           user_id BINARY(16) NOT NULL,
                           inventory_id BINARY(16) NOT NULL,
                           version BIGINT,
                           created_by VARCHAR(255),
                           updated_by VARCHAR(255),
                           created_at DATETIME(6) NOT NULL,
                           updated_at DATETIME(6),
                           PRIMARY KEY (id),
                           CONSTRAINT uk_bookmark_user_inventory UNIQUE (user_id, inventory_id),
                           CONSTRAINT fk_bookmark_user FOREIGN KEY (user_id) REFERENCES users (id),
                           CONSTRAINT fk_bookmark_inventory FOREIGN KEY (inventory_id) REFERENCES inventory (id)
);

-- Envers audit table, since Bookmark is @Audited like your other entities
CREATE TABLE bookmarks_aud (
                               id BINARY(16) NOT NULL,
                               rev INT NOT NULL,
                               revtype TINYINT,
                               user_id BINARY(16),
                               inventory_id BINARY(16),
                               PRIMARY KEY (id, rev),
                               CONSTRAINT fk_bookmarks_aud_rev FOREIGN KEY (rev) REFERENCES revinfo (rev)
);
