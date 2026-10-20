package com.suwalink.event;

import java.util.UUID;

/** A notification row was saved; the mailer emails it once the saving transaction commits. */
public record NotificationCreatedEvent(UUID notificationId) {
}
