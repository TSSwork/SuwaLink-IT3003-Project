package com.suwalink.event;

import com.suwalink.entity.CancelledBy;
import com.suwalink.entity.NotificationType;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.NotificationService;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Turns domain events into keyed notifications (recipients per spec §9.6). Text lives in the
 * message bundles under {@code <key>.title} / {@code <key>.body}; params fill their {@code {name}}
 * placeholders when the notification is rendered in the reader's language.
 */
@Component
public class NotificationEventListener {

    private static final String PHARMACY_RESERVATIONS = "/pharmacy/reservations";

    /**
     * Param holding the customer's user id next to {@code customer} (their name), so the name can be
     * replaced when the customer deletes their account. Not referenced by any message text.
     */
    public static final String CUSTOMER_ID_PARAM = "customerId";

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
    public void handlePharmacyRegisteredEvent(PharmacyRegisteredEvent event) {
        Map<String, String> params = Map.of("pharmacy", event.getPharmacyName());
        for (User admin : userRepository.findAllByRole(Role.ADMIN)) {
            notificationService.notify(admin, NotificationType.SYSTEM_ALERT,
                    NotificationKeys.PHARMACY_REGISTERED, params, "/admin/pharmacies");
        }
    }

    @EventListener
    public void handlePharmacyVerifiedEvent(PharmacyVerifiedEvent event) {
        notificationService.notify(findUser(event.getPharmacyUserId()), NotificationType.SYSTEM_ALERT,
                NotificationKeys.PHARMACY_APPROVED, Map.of("pharmacy", event.getPharmacyName()), "/pharmacy");
    }

    @EventListener
    public void handlePharmacyRejectedEvent(PharmacyRejectedEvent event) {
        notificationService.notify(findUser(event.getPharmacyUserId()), NotificationType.SYSTEM_ALERT,
                NotificationKeys.PHARMACY_REJECTED, Map.of("pharmacy", event.getPharmacyName()), "/");
    }

    @EventListener
    public void handleMedicineSuggestionReviewedEvent(MedicineSuggestionReviewedEvent event) {
        Map<String, String> params = event.isApproved()
                ? Map.of("medicine", event.getMedicineName())
                : Map.of("medicine", event.getMedicineName(), "reason", event.getReason());
        notificationService.notify(findUser(event.getPharmacyUserId()), NotificationType.SYSTEM_ALERT,
                event.isApproved() ? NotificationKeys.MEDICINE_APPROVED : NotificationKeys.MEDICINE_REJECTED,
                params, "/pharmacy/inventory");
    }

    @EventListener
    public void handlePrescriptionAddedEvent(PrescriptionAddedEvent event) {
        UUID requestId = event.getRequestId();
        notificationService.notify(findUser(event.getCustomerUserId()), NotificationType.PRESCRIPTION,
                NotificationKeys.PRESCRIPTION_SENT,
                Map.of("count", String.valueOf(event.getPharmacyUserIds().size())),
                "/prescriptions/" + requestId);

        for (UUID pharmacyUserId : event.getPharmacyUserIds()) {
            notificationService.notify(findUser(pharmacyUserId), NotificationType.PRESCRIPTION,
                    NotificationKeys.PRESCRIPTION_NEW, Map.of(), "/pharmacy/requests/" + requestId);
        }
    }

    @EventListener
    public void handlePharmacyRespondedEvent(PharmacyRespondedEvent event) {
        String key = event.isUpdated()
                ? NotificationKeys.PRESCRIPTION_RESPONSE_UPDATED
                : NotificationKeys.PRESCRIPTION_RESPONDED;
        notificationService.notify(findUser(event.getPatientUserId()), NotificationType.PRESCRIPTION,
                key, Map.of("pharmacy", event.getPharmacyName()), "/prescriptions/" + event.getRequestId());
    }

    @EventListener
    public void handlePrescriptionRequestExpiredEvent(PrescriptionRequestExpiredEvent event) {
        notificationService.notify(findUser(event.getCustomerUserId()), NotificationType.PRESCRIPTION,
                NotificationKeys.PRESCRIPTION_EXPIRED, Map.of(), "/prescriptions/" + event.getRequestId());
    }

    @EventListener
    public void handleReservationCreatedEvent(ReservationCreatedEvent event) {
        Reservation reservation = findReservation(event.getReservationId());
        String items = describeItems(reservation);

        notificationService.notify(reservation.getPatient(), NotificationType.RESERVATION,
                NotificationKeys.RESERVATION_CONFIRMED,
                Map.of("items", items, "pharmacy", reservation.getPharmacy().getName(),
                        "code", reservation.getPickupCode()),
                customerLink(reservation));

        notificationService.notify(reservation.getPharmacy().getUser(), NotificationType.RESERVATION,
                NotificationKeys.RESERVATION_NEW,
                Map.of("items", items, "customer", reservation.getPatient().getName(),
                        CUSTOMER_ID_PARAM, reservation.getPatient().getId().toString()),
                PHARMACY_RESERVATIONS);
    }

    @EventListener
    public void handleReservationCancelledEvent(ReservationCancelledEvent event) {
        Reservation reservation = findReservation(event.getReservationId());
        String items = describeItems(reservation);

        if (event.getCancelledBy() == CancelledBy.PATIENT) {
            notificationService.notify(reservation.getPharmacy().getUser(), NotificationType.RESERVATION,
                    NotificationKeys.RESERVATION_CANCELLED_BY_CUSTOMER,
                    Map.of("items", items, "customer", reservation.getPatient().getName(),
                        CUSTOMER_ID_PARAM, reservation.getPatient().getId().toString()),
                    PHARMACY_RESERVATIONS);
        } else {
            notificationService.notify(reservation.getPatient(), NotificationType.RESERVATION,
                    NotificationKeys.RESERVATION_CANCELLED_BY_PHARMACY,
                    Map.of("items", items, "pharmacy", reservation.getPharmacy().getName()),
                    customerLink(reservation));
        }
    }

    @EventListener
    public void handleReservationCompletedEvent(ReservationCompletedEvent event) {
        Reservation reservation = findReservation(event.getReservationId());

        notificationService.notify(reservation.getPatient(), NotificationType.RESERVATION,
                NotificationKeys.RESERVATION_COMPLETED,
                Map.of("items", describeItems(reservation), "pharmacy", reservation.getPharmacy().getName()),
                customerLink(reservation));
    }

    @EventListener
    public void handleReservationExpiredEvent(ReservationExpiredEvent event) {
        Reservation reservation = findReservation(event.getReservationId());
        Map<String, String> params = Map.of(
                "items", describeItems(reservation),
                "pharmacy", reservation.getPharmacy().getName(),
                "customer", reservation.getPatient().getName(),
                CUSTOMER_ID_PARAM, reservation.getPatient().getId().toString());

        notificationService.notify(reservation.getPatient(), NotificationType.RESERVATION,
                NotificationKeys.RESERVATION_EXPIRED, params, customerLink(reservation));
        notificationService.notify(reservation.getPharmacy().getUser(), NotificationType.RESERVATION,
                NotificationKeys.RESERVATION_EXPIRED, params, PHARMACY_RESERVATIONS);
    }

    /** Language-neutral item list, e.g. "Panadol 500mg × 2, Amoxil 250mg × 1". */
    private static String describeItems(Reservation reservation) {
        return reservation.getItems().stream()
                .map(item -> item.getMedicineName() + " × " + item.getQuantity())
                .collect(Collectors.joining(", "));
    }

    private static String customerLink(Reservation reservation) {
        return "/reservations/" + reservation.getId();
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
