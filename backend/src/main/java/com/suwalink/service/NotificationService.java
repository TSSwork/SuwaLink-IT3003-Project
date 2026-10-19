package com.suwalink.service;

import com.suwalink.entity.Notification;
import com.suwalink.entity.NotificationType;
import com.suwalink.entity.User;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public void createNotification(User recipient, String title, String message, NotificationType type) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    public List<Notification> getUserNotifications(User user) {
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(user);
    }

    public long getUnreadCount(User user) {
        return notificationRepository.countByRecipientAndIsReadFalse(user);
    }

    @Transactional
    public void markAsRead(UUID notificationId, User currentUser) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        // Ensure the notification belongs to the current user; report unowned notifications the
        // same way as missing ones rather than silently no-oping with a false "success".
        if (!notification.getRecipient().getId().equals(currentUser.getId())) {
            throw new ResourceNotFoundException("Notification not found: " + notificationId);
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }
}
