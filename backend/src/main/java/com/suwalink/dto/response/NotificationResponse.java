package com.suwalink.dto.response;

import com.suwalink.entity.NotificationType;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** A notification rendered in the request language. */
@Getter
@Builder
@AllArgsConstructor
public class NotificationResponse {

    private final UUID id;
    private final NotificationType type;
    private final String title;
    private final String message;
    /** Frontend route to open, or null. */
    private final String link;
    private final boolean read;
    private final LocalDateTime createdAt;
}
