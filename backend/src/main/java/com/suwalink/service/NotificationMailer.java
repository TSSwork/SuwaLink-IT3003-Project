package com.suwalink.service;

import com.suwalink.event.NotificationCreatedEvent;

/** Emails a stored notification to its recipient, in their language, after the creating transaction commits. */
public interface NotificationMailer {

    void onNotificationCreated(NotificationCreatedEvent event);
}
