package com.suwalink.IT3003.event;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.suwalink.IT3003.entity.CancelledBy;
import com.suwalink.IT3003.entity.Category;
import com.suwalink.IT3003.entity.Currency;
import com.suwalink.IT3003.entity.Inventory;
import com.suwalink.IT3003.entity.Manufacturer;
import com.suwalink.IT3003.entity.MedicineMaster;
import com.suwalink.IT3003.entity.NotificationType;
import com.suwalink.IT3003.entity.Pharmacy;
import com.suwalink.IT3003.entity.PharmacyStatus;
import com.suwalink.IT3003.entity.PrescriptionStatus;
import com.suwalink.IT3003.entity.Reservation;
import com.suwalink.IT3003.entity.ReservationStatus;
import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.entity.UnitOfMeasure;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.repository.ReservationRepository;
import com.suwalink.IT3003.repository.UserRepository;
import com.suwalink.IT3003.service.NotificationService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class NotificationEventListenerTest {

    private NotificationService notificationService;
    private UserRepository userRepository;
    private ReservationRepository reservationRepository;
    private NotificationEventListener listener;

    @BeforeEach
    void setUp() {
        notificationService = mock(NotificationService.class);
        userRepository = mock(UserRepository.class);
        reservationRepository = mock(ReservationRepository.class);
        listener = new NotificationEventListener(notificationService, userRepository, reservationRepository);
    }

    @Test
    void handlePharmacyVerifiedEvent_notifiesThePharmacyUser() {
        User pharmacyUser = user("pharmacy@example.com", Role.PHARMACY_ADMIN);
        when(userRepository.findById(pharmacyUser.getId())).thenReturn(Optional.of(pharmacyUser));

        listener.handlePharmacyVerifiedEvent(new PharmacyVerifiedEvent(this, pharmacyUser.getId()));

        verify(notificationService).createNotification(
                eq(pharmacyUser), any(), any(), eq(NotificationType.SYSTEM_ALERT));
    }

    @Test
    void handlePrescriptionAddedEvent_notifiesEveryPharmacyUser() {
        User pharmacyA = user("a@example.com", Role.PHARMACY_ADMIN);
        User pharmacyB = user("b@example.com", Role.PHARMACY_ADMIN);
        when(userRepository.findById(pharmacyA.getId())).thenReturn(Optional.of(pharmacyA));
        when(userRepository.findById(pharmacyB.getId())).thenReturn(Optional.of(pharmacyB));

        listener.handlePrescriptionAddedEvent(
                new PrescriptionAddedEvent(this, List.of(pharmacyA.getId(), pharmacyB.getId())));

        verify(notificationService).createNotification(
                eq(pharmacyA), any(), any(), eq(NotificationType.PRESCRIPTION));
        verify(notificationService).createNotification(
                eq(pharmacyB), any(), any(), eq(NotificationType.PRESCRIPTION));
    }

    @Test
    void handlePharmacyRespondedEvent_notifiesThePatient() {
        User patient = user("patient@example.com", Role.CUSTOMER);
        when(userRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        listener.handlePharmacyRespondedEvent(new PharmacyRespondedEvent(this, patient.getId(), "City Pharmacy"));

        verify(notificationService).createNotification(
                eq(patient), any(), any(), eq(NotificationType.PRESCRIPTION));
    }

    @Test
    void handleReservationCreatedEvent_notifiesBothPatientAndPharmacy() {
        Reservation reservation = sampleReservation();
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        listener.handleReservationCreatedEvent(new ReservationCreatedEvent(this, reservation.getId()));

        verify(notificationService).createNotification(
                eq(reservation.getPatient()), any(), any(), eq(NotificationType.RESERVATION));
        verify(notificationService).createNotification(
                eq(reservation.getPharmacy().getUser()), any(), any(), eq(NotificationType.RESERVATION));
    }

    @Test
    void handleReservationCancelledEvent_byPatient_notifiesThePharmacy() {
        Reservation reservation = sampleReservation();
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        listener.handleReservationCancelledEvent(
                new ReservationCancelledEvent(this, reservation.getId(), CancelledBy.PATIENT));

        verify(notificationService).createNotification(
                eq(reservation.getPharmacy().getUser()), any(), any(), eq(NotificationType.RESERVATION));
    }

    @Test
    void handleReservationCancelledEvent_byPharmacy_notifiesThePatient() {
        Reservation reservation = sampleReservation();
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        listener.handleReservationCancelledEvent(
                new ReservationCancelledEvent(this, reservation.getId(), CancelledBy.PHARMACY));

        verify(notificationService).createNotification(
                eq(reservation.getPatient()), any(), any(), eq(NotificationType.RESERVATION));
    }

    private User user(String email, Role role) {
        return User.builder()
                .id(UUID.randomUUID())
                .name("Test User")
                .email(email)
                .phone("0770000000")
                .password("hash")
                .role(role)
                .build();
    }

    private Reservation sampleReservation() {
        User patient = user("patient@example.com", Role.CUSTOMER);
        User pharmacyUser = user("pharmacy@example.com", Role.PHARMACY_ADMIN);
        Pharmacy pharmacy = Pharmacy.builder()
                .id(UUID.randomUUID())
                .licenceNo("LIC-1")
                .address("Addr")
                .status(PharmacyStatus.VERIFIED)
                .user(pharmacyUser)
                .build();
        Manufacturer manufacturer = Manufacturer.builder()
                .id(UUID.randomUUID())
                .name("Acme")
                .country("Sri Lanka")
                .isActive(true)
                .build();
        Category category = Category.builder()
                .id(UUID.randomUUID())
                .name("Painkillers")
                .active(true)
                .build();
        MedicineMaster medicine = MedicineMaster.builder()
                .id(UUID.randomUUID())
                .brandName("Panadol")
                .genericName("Paracetamol")
                .dosageForm("Tablet")
                .strength("500mg")
                .unitOfMeasure(UnitOfMeasure.TABLET)
                .manufacturer(manufacturer)
                .therapeuticCategory(category)
                .legalCategory(PrescriptionStatus.OTC)
                .build();
        Inventory inventory = Inventory.builder()
                .id(UUID.randomUUID())
                .medicineMaster(medicine)
                .pharmacy(pharmacy)
                .unitPrice(BigDecimal.TEN)
                .currency(Currency.LKR)
                .expireDate(LocalDate.now().plusYears(1))
                .stockQuantity(10)
                .available(true)
                .build();

        return Reservation.builder()
                .id(UUID.randomUUID())
                .patient(patient)
                .pharmacy(pharmacy)
                .inventoryItem(inventory)
                .quantity(2)
                .unitPrice(BigDecimal.TEN)
                .status(ReservationStatus.CONFIRMED)
                .build();
    }
}
