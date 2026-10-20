package com.suwalink.event;

import com.suwalink.entity.CancelledBy;
import com.suwalink.entity.NotificationType;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationItem;
import com.suwalink.entity.User;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.NotificationService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;
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
    public void handlePharmacyRejectedEvent(PharmacyRejectedEvent event) {
        String title = "Pharmacy Application Rejected";
        String message = "Your pharmacy application was reviewed and was not approved.";
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
        String title = event.isUpdated() ? "Pharmacy updated its response" : "Pharmacy Responded";
        String message = event.getPharmacyName()
                + (event.isUpdated() ? " has updated its response to your prescription."
                        : " has responded to your prescription.")
                + " Please check your dashboard.";

        User recipient = findUser(event.getPatientUserId());
        notificationService.createNotification(recipient, title, message, NotificationType.PRESCRIPTION);
    }

    @EventListener
    public void handleReservationCreatedEvent(ReservationCreatedEvent event) {
        Reservation reservation = findReservation(event.getReservationId());
        String reserved = describeItems(reservation);
        String pharmacyName = reservation.getPharmacy().getName();

        notificationService.createNotification(
                reservation.getPatient(),
                "Reservation Confirmed",
                "Your reservation of " + reserved + " at " + pharmacyName + " is confirmed.",
                NotificationType.RESERVATION);

        notificationService.createNotification(
                reservation.getPharmacy().getUser(),
                "New Reservation",
                reservation.getPatient().getName() + " reserved " + reserved + ".",
                NotificationType.RESERVATION);
    }

    @EventListener
    public void handleReservationCancelledEvent(ReservationCancelledEvent event) {
        Reservation reservation = findReservation(event.getReservationId());
        String reserved = describeItems(reservation);

        if (event.getCancelledBy() == CancelledBy.PATIENT) {
            notificationService.createNotification(
                    reservation.getPharmacy().getUser(),
                    "Reservation Cancelled",
                    reservation.getPatient().getName() + " cancelled their reservation of " + reserved + ".",
                    NotificationType.RESERVATION);
        } else {
            notificationService.createNotification(
                    reservation.getPatient(),
                    "Reservation Cancelled",
                    "Your reservation of " + reserved + " was cancelled by the pharmacy.",
                    NotificationType.RESERVATION);
        }
    }

    @EventListener
    public void handleReservationCompletedEvent(ReservationCompletedEvent event) {
        Reservation reservation = findReservation(event.getReservationId());

        notificationService.createNotification(
                reservation.getPatient(),
                "Reservation Completed",
                "You collected " + describeItems(reservation) + " from " + reservation.getPharmacy().getName() + ".",
                NotificationType.RESERVATION);
    }

    @EventListener
    public void handleReservationExpiredEvent(ReservationExpiredEvent event) {
        Reservation reservation = findReservation(event.getReservationId());
        String reserved = describeItems(reservation);

        notificationService.createNotification(
                reservation.getPatient(),
                "Reservation Expired",
                "Your reservation of " + reserved + " at " + reservation.getPharmacy().getName()
                        + " was not collected in time and has expired.",
                NotificationType.RESERVATION);

        notificationService.createNotification(
                reservation.getPharmacy().getUser(),
                "Reservation Expired",
                reservation.getPatient().getName() + "'s reservation of " + reserved
                        + " expired uncollected; the stock was released.",
                NotificationType.RESERVATION);
    }

    /** "3 items" for a multi-line reservation, otherwise "2 x Panadol 500mg". */
    private String describeItems(Reservation reservation) {
        List<ReservationItem> items = reservation.getItems();
        if (items.size() == 1) {
            ReservationItem item = items.get(0);
            return item.getQuantity() + " x " + item.getMedicineName();
        }
        return items.size() + " items";
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
