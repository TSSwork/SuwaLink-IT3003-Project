package com.suwalink.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.suwalink.entity.CancelledBy;
import com.suwalink.entity.Category;
import com.suwalink.entity.Currency;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.NotificationType;
import com.suwalink.entity.District;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationItem;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.UnitOfMeasure;
import com.suwalink.entity.User;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.NotificationService;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Properties;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    void pharmacyRegistrationNotifiesAdmins() {
        User adminA = user("admin.a@example.com", Role.ADMIN);
        User adminB = user("admin.b@example.com", Role.ADMIN);
        when(userRepository.findAllByRole(Role.ADMIN)).thenReturn(List.of(adminA, adminB));

        listener.handlePharmacyRegisteredEvent(new PharmacyRegisteredEvent(this, UUID.randomUUID(), "City Pharmacy"));

        for (User admin : List.of(adminA, adminB)) {
            verify(notificationService).notify(admin, NotificationType.SYSTEM_ALERT,
                    NotificationKeys.PHARMACY_REGISTERED, Map.of("pharmacy", "City Pharmacy"), "/admin/pharmacies");
        }
        verifyNoMoreInteractions(notificationService);
    }

    @Test
    void pharmacyApprovedNotifiesOwner() {
        User owner = user("pharmacy@example.com", Role.PHARMACY_OWNER);
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));

        listener.handlePharmacyVerifiedEvent(new PharmacyVerifiedEvent(this, owner.getId(), "City Pharmacy"));

        verify(notificationService).notify(owner, NotificationType.SYSTEM_ALERT,
                NotificationKeys.PHARMACY_APPROVED, Map.of("pharmacy", "City Pharmacy"), "/pharmacy");
    }

    @Test
    void pharmacyRejectedNotifiesOwner() {
        User owner = user("pharmacy@example.com", Role.PHARMACY_OWNER);
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));

        listener.handlePharmacyRejectedEvent(new PharmacyRejectedEvent(this, owner.getId(), "City Pharmacy"));

        verify(notificationService).notify(owner, NotificationType.SYSTEM_ALERT,
                NotificationKeys.PHARMACY_REJECTED, Map.of("pharmacy", "City Pharmacy"), "/");
    }

    @Test
    void prescriptionSentNotifiesCustomerAndTargetsOnly() {
        User customer = user("patient@example.com", Role.CUSTOMER);
        User pharmacyA = user("a@example.com", Role.PHARMACY_OWNER);
        User pharmacyB = user("b@example.com", Role.PHARMACY_OWNER);
        for (User u : List.of(customer, pharmacyA, pharmacyB)) {
            when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        }
        UUID requestId = UUID.randomUUID();

        listener.handlePrescriptionAddedEvent(new PrescriptionAddedEvent(
                this, requestId, customer.getId(), List.of(pharmacyA.getId(), pharmacyB.getId())));

        verify(notificationService).notify(customer, NotificationType.PRESCRIPTION,
                NotificationKeys.PRESCRIPTION_SENT, Map.of("count", "2"), "/prescriptions/" + requestId);
        for (User pharmacy : List.of(pharmacyA, pharmacyB)) {
            verify(notificationService).notify(pharmacy, NotificationType.PRESCRIPTION,
                    NotificationKeys.PRESCRIPTION_NEW, Map.of(), "/pharmacy/requests/" + requestId);
        }
        verifyNoMoreInteractions(notificationService);
    }

    @Test
    void pharmacyRespondedNotifiesCustomer() {
        User customer = user("patient@example.com", Role.CUSTOMER);
        when(userRepository.findById(customer.getId())).thenReturn(Optional.of(customer));
        UUID requestId = UUID.randomUUID();

        listener.handlePharmacyRespondedEvent(
                new PharmacyRespondedEvent(this, requestId, customer.getId(), "City Pharmacy", false));
        listener.handlePharmacyRespondedEvent(
                new PharmacyRespondedEvent(this, requestId, customer.getId(), "City Pharmacy", true));

        verify(notificationService).notify(customer, NotificationType.PRESCRIPTION,
                NotificationKeys.PRESCRIPTION_RESPONDED, Map.of("pharmacy", "City Pharmacy"),
                "/prescriptions/" + requestId);
        verify(notificationService).notify(customer, NotificationType.PRESCRIPTION,
                NotificationKeys.PRESCRIPTION_RESPONSE_UPDATED, Map.of("pharmacy", "City Pharmacy"),
                "/prescriptions/" + requestId);
    }

    @Test
    void expiredRequestNotifiesCustomer() {
        User customer = user("patient@example.com", Role.CUSTOMER);
        when(userRepository.findById(customer.getId())).thenReturn(Optional.of(customer));
        UUID requestId = UUID.randomUUID();

        listener.handlePrescriptionRequestExpiredEvent(
                new PrescriptionRequestExpiredEvent(this, requestId, customer.getId()));

        verify(notificationService).notify(customer, NotificationType.PRESCRIPTION,
                NotificationKeys.PRESCRIPTION_EXPIRED, Map.of(), "/prescriptions/" + requestId);
        verifyNoMoreInteractions(notificationService);
    }

    @Test
    void reservationCreatedNotifiesCustomerAndPharmacy() {
        Reservation reservation = sampleReservation();
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        listener.handleReservationCreatedEvent(new ReservationCreatedEvent(this, reservation.getId()));

        verify(notificationService).notify(reservation.getPatient(), NotificationType.RESERVATION,
                NotificationKeys.RESERVATION_CONFIRMED,
                Map.of("items", "Panadol 500mg × 2", "pharmacy", "Test Pharmacy", "code", "ABCDEFGH23"),
                "/reservations/" + reservation.getId());
        verify(notificationService).notify(reservation.getPharmacy().getUser(), NotificationType.RESERVATION,
                NotificationKeys.RESERVATION_NEW,
                Map.of("items", "Panadol 500mg × 2", "customer", "Test User"),
                "/pharmacy/reservations");
    }

    @Test
    void reservationItemsListEveryLine() {
        Reservation reservation = sampleReservation();
        Inventory inventory = reservation.getItems().get(0).getInventoryItem();
        reservation.addItem(ReservationItem.builder()
                .id(UUID.randomUUID())
                .inventoryItem(inventory)
                .quantity(1)
                .unitPrice(BigDecimal.ONE)
                .medicineName("Amoxil 250mg")
                .build());
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        listener.handleReservationCompletedEvent(new ReservationCompletedEvent(this, reservation.getId()));

        verify(notificationService).notify(reservation.getPatient(), NotificationType.RESERVATION,
                NotificationKeys.RESERVATION_COMPLETED,
                Map.of("items", "Panadol 500mg × 2, Amoxil 250mg × 1", "pharmacy", "Test Pharmacy"),
                "/reservations/" + reservation.getId());
    }

    @Test
    void reservationCancelledByCustomerNotifiesPharmacyOnly() {
        Reservation reservation = sampleReservation();
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        listener.handleReservationCancelledEvent(
                new ReservationCancelledEvent(this, reservation.getId(), CancelledBy.PATIENT));

        verify(notificationService).notify(eq(reservation.getPharmacy().getUser()), eq(NotificationType.RESERVATION),
                eq(NotificationKeys.RESERVATION_CANCELLED_BY_CUSTOMER), anyMap(), eq("/pharmacy/reservations"));
        verifyNoMoreInteractions(notificationService);
    }

    @Test
    void reservationCancelledByPharmacyNotifiesCustomerOnly() {
        Reservation reservation = sampleReservation();
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        listener.handleReservationCancelledEvent(
                new ReservationCancelledEvent(this, reservation.getId(), CancelledBy.PHARMACY));

        verify(notificationService).notify(eq(reservation.getPatient()), eq(NotificationType.RESERVATION),
                eq(NotificationKeys.RESERVATION_CANCELLED_BY_PHARMACY), anyMap(),
                eq("/reservations/" + reservation.getId()));
        verifyNoMoreInteractions(notificationService);
    }

    @Test
    void reservationExpiredNotifiesBothSides() {
        Reservation reservation = sampleReservation();
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        listener.handleReservationExpiredEvent(new ReservationExpiredEvent(this, reservation.getId()));

        verify(notificationService).notify(eq(reservation.getPatient()), eq(NotificationType.RESERVATION),
                eq(NotificationKeys.RESERVATION_EXPIRED), anyMap(), eq("/reservations/" + reservation.getId()));
        verify(notificationService).notify(eq(reservation.getPharmacy().getUser()), eq(NotificationType.RESERVATION),
                eq(NotificationKeys.RESERVATION_EXPIRED), anyMap(), eq("/pharmacy/reservations"));
        verify(notificationService, times(2)).notify(any(), any(), anyString(), anyMap(), anyString());
    }

    /** Every key the listener (or Task 6's medicine events) can use has a title and body in en/si/ta. */
    @Test
    void everyNotifyKeyExistsInAllBundles() throws Exception {
        List<String> keys = new java.util.ArrayList<>();
        for (Field field : NotificationKeys.class.getDeclaredFields()) {
            if (Modifier.isStatic(field.getModifiers()) && field.getType() == String.class) {
                keys.add((String) field.get(null));
            }
        }
        assertThat(keys).contains("notify.pharmacy.registered", "notify.reservation.expired",
                "notify.medicine.approved", "notify.medicine.rejected");

        for (String bundle : List.of("messages", "messages_si", "messages_ta")) {
            Properties properties = new Properties();
            try (var in = getClass().getResourceAsStream("/i18n/" + bundle + ".properties")) {
                properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
            }
            for (String key : keys) {
                assertThat(properties.getProperty(key + ".title")).as(bundle + ": " + key + ".title").isNotBlank();
                assertThat(properties.getProperty(key + ".body")).as(bundle + ": " + key + ".body").isNotBlank();
            }
        }
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
        User pharmacyUser = user("pharmacy@example.com", Role.PHARMACY_OWNER);
        Pharmacy pharmacy = Pharmacy.builder()
                .id(UUID.randomUUID())
                .name("Test Pharmacy")
                .phone("0112345678")
                .district(District.COLOMBO)
                .city("Colombo")
                .latitude(new java.math.BigDecimal("6.927100"))
                .longitude(new java.math.BigDecimal("79.861200"))
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

        Reservation reservation = Reservation.builder()
                .id(UUID.randomUUID())
                .patient(patient)
                .pharmacy(pharmacy)
                .pickupCode("ABCDEFGH23")
                .expiresAt(LocalDateTime.now().plusHours(24))
                .status(ReservationStatus.CONFIRMED)
                .build();
        reservation.addItem(ReservationItem.builder()
                .id(UUID.randomUUID())
                .inventoryItem(inventory)
                .quantity(2)
                .unitPrice(BigDecimal.TEN)
                .medicineName("Panadol 500mg")
                .requiresPrescription(false)
                .build());
        return reservation;
    }
}
