package com.suwalink.service.impl;

import com.suwalink.dto.response.NotificationResponse;
import com.suwalink.entity.Notification;
import com.suwalink.entity.NotificationType;
import com.suwalink.entity.User;
import com.suwalink.event.NotificationCreatedEvent;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.NotificationService;
import com.suwalink.util.MessageRenderer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final CurrentUserProvider currentUserProvider;
    private final MessageRenderer messageRenderer;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public Notification notify(User recipient, NotificationType type, String messageKey,
                               Map<String, String> params, String link) {
        Notification saved = notificationRepository.save(Notification.builder()
                .recipient(recipient)
                .type(type)
                .messageKey(messageKey)
                .params(params == null ? new HashMap<>() : new HashMap<>(params))
                .link(link)
                .isRead(false)
                .build());
        eventPublisher.publishEvent(new NotificationCreatedEvent(saved.getId()));
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> listMine(Locale locale) {
        User user = currentUserProvider.getCurrentUser();
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(user).stream()
                .map(notification -> toResponse(notification, locale))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount() {
        return notificationRepository.countByRecipientAndIsReadFalse(currentUserProvider.getCurrentUser());
    }

    @Override
    @Transactional
    public void markRead(UUID id) {
        User user = currentUserProvider.getCurrentUser();
        Notification notification = notificationRepository.findById(id)
                .filter(n -> n.getRecipient().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));
        notification.setRead(true);
    }

    @Override
    @Transactional
    public void markAllRead() {
        notificationRepository.findByRecipientAndIsReadFalse(currentUserProvider.getCurrentUser())
                .forEach(notification -> notification.setRead(true));
    }

    private NotificationResponse toResponse(Notification notification, Locale locale) {
        String key = notification.getMessageKey();
        Map<String, String> params = notification.getParams();
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(messageRenderer.render(key + ".title", params, locale))
                .message(messageRenderer.render(key + ".body", params, locale))
                .link(notification.getLink())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
