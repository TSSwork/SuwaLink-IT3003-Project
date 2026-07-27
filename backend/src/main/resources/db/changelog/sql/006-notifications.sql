CREATE TABLE notifications (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    recipient_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)
);

CREATE TABLE notifications_aud (
    id VARCHAR(36) NOT NULL,
    rev INT NOT NULL,
    revtype TINYINT,
    recipient_id VARCHAR(36),
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN,
    PRIMARY KEY (id, rev),
    CONSTRAINT fk_notification_aud_rev FOREIGN KEY (rev) REFERENCES revinfo(rev)
);
