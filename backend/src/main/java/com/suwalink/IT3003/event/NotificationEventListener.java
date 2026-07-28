package com.suwalink.IT3003.event;

import com.suwalink.IT3003.service.NotificationService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

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

    @EventListener
    public void handlePrescriptionAddedEvent(PrescriptionAddedEvent event) {
        String title = "New Prescription Available";
        String message = "A new prescription has been uploaded in your area. Please check the dashboard to respond.";
        
        for (UUID pharmacyUserId : event.getPharmacyUserIds()) {
            notificationService.createNotification(pharmacyUserId, title, message);
        }
    }

    @EventListener
    public void handlePharmacyRespondedEvent(PharmacyRespondedEvent event) {
        String title = "Pharmacy Responded";
        String message = event.getPharmacyName() + " has responded to your prescription. Please check your dashboard.";
        
        // අදාළ Patient ට Notification එක යවනවා
        notificationService.createNotification(event.getPatientUserId(), title, message);
    }
}
