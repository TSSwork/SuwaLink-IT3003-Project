package com.suwalink.IT3003.event;

import com.suwalink.IT3003.service.NotificationService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class NotificationEventListener {

    private final NotificationService notificationService;

    public NotificationEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }
    @EventListener
    public void handlePharmacyVerifiedEvent(PharmacyVerifiedEvent event) {
        String title = "Pharmacy Verified";
        String message = "Your pharmacy profile has been successfully verified by the Admin!";
        notificationService.createNotification(event.getPharmacyUserId(), title, message);
    }
}
