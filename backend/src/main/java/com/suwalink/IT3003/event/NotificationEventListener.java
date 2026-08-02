package com.suwalink.IT3003.event;

import com.suwalink.IT3003.entity.CancelledBy;
import com.suwalink.IT3003.entity.NotificationType;
import com.suwalink.IT3003.entity.Reservation;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.repository.ReservationRepository;
import com.suwalink.IT3003.repository.UserRepository;
import com.suwalink.IT3003.service.NotificationService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final ReservationRepository reservationRepository;

    public NotificationEventListener(
            NotificationService notificationService,
            UserRepository userRepository,
            ReservationRepository reservationRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.reservationRepository = reservationRepository;
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

        User recipient = findUser(event.getPatientUserId());
        notificationService.createNotification(recipient, title, message, NotificationType.PRESCRIPTION);
    }

    @EventListener
    public void handleReservationCreatedEvent(ReservationCreatedEvent event) {
        Reservation reservation = findReservation(event.getReservationId());
        String medicineBrandName = reservation.getInventoryItem().getMedicineMaster().getBrandName();
        String pharmacyName = reservation.getPharmacy().getUser().getName();

        notificationService.createNotification(
                reservation.getPatient(),
                "Reservation Confirmed",
                "Your reservation for " + medicineBrandName + " at " + pharmacyName + " is confirmed.",
                NotificationType.RESERVATION);

        notificationService.createNotification(
                reservation.getPharmacy().getUser(),
                "New Reservation",
                reservation.getPatient().getName() + " reserved " + reservation.getQuantity()
                        + " x " + medicineBrandName + ".",
                NotificationType.RESERVATION);
    }

    @EventListener
    public void handleReservationCancelledEvent(ReservationCancelledEvent event) {
        Reservation reservation = findReservation(event.getReservationId());
        String medicineBrandName = reservation.getInventoryItem().getMedicineMaster().getBrandName();

        if (event.getCancelledBy() == CancelledBy.PATIENT) {
            notificationService.createNotification(
                    reservation.getPharmacy().getUser(),
                    "Reservation Cancelled",
                    reservation.getPatient().getName() + " cancelled their reservation for "
                            + medicineBrandName + ".",
                    NotificationType.RESERVATION);
        } else {
            notificationService.createNotification(
                    reservation.getPatient(),
                    "Reservation Cancelled",
                    "Your reservation for " + medicineBrandName + " was cancelled by the pharmacy.",
                    NotificationType.RESERVATION);
        }
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
    }

    private Reservation findReservation(UUID reservationId) {
        return reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found: " + reservationId));
    }
}
