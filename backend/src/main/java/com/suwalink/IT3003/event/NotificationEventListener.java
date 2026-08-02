package com.suwalink.IT3003.event;

import com.suwalink.IT3003.entity.NotificationType;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.repository.UserRepository;
import com.suwalink.IT3003.service.NotificationService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationEventListener(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @EventListener
    public void handlePharmacyVerifiedEvent(PharmacyVerifiedEvent event) {
        String title = "Pharmacy Verified";
        String message = "Your pharmacy profile has been successfully verified by the Admin!";
        User recipient = findUser(event.getPharmacyUserId());
        notificationService.createNotification(recipient, title, message, NotificationType.SYSTEM_ALERT);
    }

    @EventListener
    public void handlePrescriptionAddedEvent(PrescriptionAddedEvent event) {
        String title = "New Prescription Available";
        String message = "A new prescription has been uploaded in your area. Please check the dashboard to respond.";

        for (UUID pharmacyUserId : event.getPharmacyUserIds()) {
            User recipient = findUser(pharmacyUserId);
            notificationService.createNotification(recipient, title, message, NotificationType.PRESCRIPTION);
        }
    }

    @EventListener
    public void handlePharmacyRespondedEvent(PharmacyRespondedEvent event) {
        String title = "Pharmacy Responded";
        String message = event.getPharmacyName() + " has responded to your prescription. Please check your dashboard.";

        // අදාළ Patient ට Notification එක යවනවා
        User recipient = findUser(event.getPatientUserId());
        notificationService.createNotification(recipient, title, message, NotificationType.PRESCRIPTION);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
    }
}
