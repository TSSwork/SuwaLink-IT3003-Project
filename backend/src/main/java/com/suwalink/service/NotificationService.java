package com.suwalink.service;

import com.suwalink.dto.response.NotificationResponse;
import com.suwalink.entity.Notification;
import com.suwalink.entity.NotificationType;
import com.suwalink.entity.User;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Keyed in-app notifications, rendered in the reader's language when listed. */
public interface NotificationService {

    /** Stores a notification whose text is {@code messageKey + ".title"/".body"} filled with {@code params}. */
    Notification notify(User recipient, NotificationType type, String messageKey, Map<String, String> params, String link);

    /** The current user's notifications, newest first, rendered in {@code locale}. */
    List<NotificationResponse> listMine(Locale locale);

    long unreadCount();

    /** Marks one of the current user's notifications read; someone else's counts as not found. */
    void markRead(UUID id);

    void markAllRead();
}
