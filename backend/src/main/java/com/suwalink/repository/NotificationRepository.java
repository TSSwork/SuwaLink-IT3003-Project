package com.suwalink.repository;

import com.suwalink.entity.Notification;
import com.suwalink.entity.User;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);
    long countByRecipientAndIsReadFalse(User recipient);
    List<Notification> findByRecipientAndIsReadFalse(User recipient);
    void deleteByRecipient_Id(UUID recipientId);

    /**
     * Notifications whose params mention the given customer id (the JSON written by
     * {@code StringMapJsonConverter} has no whitespace, so {@code "customerId":"<id>"} is exact).
     */
    @Query(value = "SELECT * FROM notifications WHERE params LIKE CONCAT('%\"customerId\":\"', :customerId, '\"%')",
            nativeQuery = true)
    List<Notification> findMentioningCustomer(@Param("customerId") String customerId);

    List<Notification> findByRecipientIdIn(Collection<UUID> recipientIds);
}
