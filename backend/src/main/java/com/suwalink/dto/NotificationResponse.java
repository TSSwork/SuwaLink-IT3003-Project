package com.suwalink.dto;

import com.suwalink.entity.NotificationType;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationResponse {
    private UUID id;
    private String title;
    private String message;
    private NotificationType type;
    private boolean isRead;
    private LocalDateTime createdAt;
}
