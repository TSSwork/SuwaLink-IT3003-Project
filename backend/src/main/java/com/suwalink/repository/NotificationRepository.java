package com.suwalink.repository;

import com.suwalink.entity.Notification;
import com.suwalink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);
    long countByRecipientAndIsReadFalse(User recipient);
    List<Notification> findByRecipientAndIsReadFalse(User recipient);
    void deleteByRecipient_Id(UUID recipientId);
}
