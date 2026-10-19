package com.suwalink.controller;

import com.suwalink.dto.NotificationResponse;
import com.suwalink.dto.response.ApiResponse;
import com.suwalink.entity.Notification;
import com.suwalink.entity.User;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getUserNotifications() {
        User currentUser = currentUserProvider.getCurrentUser();
        List<NotificationResponse> responses = notificationService.getUserNotifications(currentUser)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success("Notifications fetched successfully", responses));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        User currentUser = currentUserProvider.getCurrentUser();
        long count = notificationService.getUnreadCount(currentUser);
        
        return ResponseEntity.ok(ApiResponse.success("Unread count fetched successfully", Map.of("count", count)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable UUID id) {
        User currentUser = currentUserProvider.getCurrentUser();
        notificationService.markAsRead(id, currentUser);
        
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read"));
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
