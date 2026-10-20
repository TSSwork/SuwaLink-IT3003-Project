package com.suwalink.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.suwalink.entity.Category;
import com.suwalink.entity.Currency;
import com.suwalink.entity.District;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.Notification;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.UnitOfMeasure;
import com.suwalink.entity.User;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.entity.Image;
import com.suwalink.entity.ImageType;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationItem;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.TargetScope;
import com.suwalink.repository.ImageRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.service.PrescriptionRequestService;
import com.suwalink.service.ReservationService;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import com.suwalink.security.JwtService;
import com.suwalink.service.ImageService;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The expiry jobs commit one transaction per record (REQUIRES_NEW), so this class is not
 * {@code @Transactional}: the seeded rows must be committed to be seen, and {@link #cleanUp()} removes them.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExpiryJobsIntegrationTest {

    @Autowired private UserRepository userRepository;
    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private MedicineMasterRepository medicineMasterRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private PrescriptionRequestRepository prescriptionRequestRepository;
    @Autowired private ImageRepository imageRepository;
    @Autowired private ReservationService reservationService;
    @Autowired private PrescriptionRequestService prescriptionRequestService;
    @Autowired private TransactionTemplate transactionTemplate;
    @Autowired private ImageService imageService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Value("${app.upload.dir}") private String uploadDir;

    private User patient;
    private User pharmacyUser;
    private Pharmacy pharmacy;
    private Manufacturer manufacturer;
    private Category category;
    private MedicineMaster medicine;
    private Image image;
    private final List<UUID> inventoryIds = new ArrayList<>();
    private final List<UUID> requestIds = new ArrayList<>();

    @BeforeEach
    void seed() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        patient = userRepository.save(user("exp.patient." + suffix + "@example.com", Role.CUSTOMER));
        pharmacyUser = userRepository.save(user("exp.pharmacy." + suffix + "@example.com", Role.PHARMACY_OWNER));
        pharmacy = pharmacyRepository.save(Pharmacy.builder()
                .name("Expiry Pharmacy")
                .phone("0112345678")
                .district(District.COLOMBO)
                .city("Colombo")
                .latitude(new BigDecimal("6.927100"))
                .longitude(new BigDecimal("79.861200"))
                .licenceNo("LIC-EXP-" + suffix)
                .address("1 Expiry Road")
                .status(PharmacyStatus.VERIFIED)
                .user(pharmacyUser)
                .build());
        manufacturer = manufacturerRepository.save(Manufacturer.builder()
                .name("Exp-" + suffix).country("Sri Lanka").isActive(true).build());
        category = categoryRepository.save(Category.builder().name("Exp-" + suffix).active(true).build());
        medicine = medicineMasterRepository.save(MedicineMaster.builder()
                .brandName("Panadol")
                .genericName("Paracetamol")
                .dosageForm("Tablet")
                .strength("500mg")
                .unitOfMeasure(UnitOfMeasure.TABLET)
                .manufacturer(manufacturer)
                .therapeuticCategory(category)
                .legalCategory(PrescriptionStatus.OTC)
                .build());
        image = imageRepository.save(Image.builder()
                .url("/x").originalFilename("x.png").generatedFilename("x-" + suffix + ".webp")
                .filePath(uploadDir + "/x-" + suffix + ".webp").mimeType("image/webp").imageType(ImageType.PRESCRIPTION)
                .build());
    }

    @AfterEach
    void cleanUp() {
        transactionTemplate.executeWithoutResult(status -> {
            reservationRepository.deleteByPharmacyId(pharmacy.getId());
            requestIds.forEach(prescriptionRequestRepository::deleteById);
            prescriptionRequestRepository.flush();
            imageRepository.deleteById(image.getId());
            notificationRepository.deleteByRecipient_Id(patient.getId());
            notificationRepository.deleteByRecipient_Id(pharmacyUser.getId());
            inventoryIds.forEach(inventoryRepository::deleteById);
            medicineMasterRepository.deleteById(medicine.getId());
            categoryRepository.deleteById(category.getId());
            manufacturerRepository.deleteById(manufacturer.getId());
            pharmacyRepository.deleteById(pharmacy.getId());
            userRepository.deleteById(patient.getId());
            userRepository.deleteById(pharmacyUser.getId());
        });
    }

    @Test
    void expireOverdueReservationsReleasesStockAndLeavesCurrentOnesAlone() {
        Inventory first = inventory(3);
        Inventory second = inventory(0);
        Reservation overdue = reservation("OVERDUE001", LocalDateTime.now().minusMinutes(1), item(first, 2), item(second, 4));
        Reservation current = reservation("CURRENT001", LocalDateTime.now().plusHours(1), item(first, 1));

        assertThat(reservationService.expireOverdue(LocalDateTime.now())).isEqualTo(1);

        assertThat(reservationRepository.findById(overdue.getId()).orElseThrow().getStatus())
                .isEqualTo(ReservationStatus.EXPIRED);
        assertThat(reservationRepository.findById(current.getId()).orElseThrow().getStatus())
                .isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(inventoryRepository.findById(first.getId()).orElseThrow().getStockQuantity()).isEqualTo(5);
        assertThat(inventoryRepository.findById(second.getId()).orElseThrow().getStockQuantity()).isEqualTo(4);
        assertThat(reservationService.expireOverdue(LocalDateTime.now())).isZero();
    }

    @Test
    void expireOverduePrescriptionRequestsMarksOnlyOverdueOnesExpired() {
        PrescriptionRequest overdue = request(LocalDateTime.now().minusMinutes(1));
        PrescriptionRequest fresh = request(LocalDateTime.now().plusDays(1));

        assertThat(prescriptionRequestService.expireOverdue(LocalDateTime.now())).isEqualTo(1);

        assertThat(prescriptionRequestRepository.findById(overdue.getId()).orElseThrow().getStatus())
                .isEqualTo(PrescriptionRequestStatus.EXPIRED);
        assertThat(prescriptionRequestRepository.findById(fresh.getId()).orElseThrow().getStatus())
                .isEqualTo(PrescriptionRequestStatus.PENDING);
    }

    @Test
    void reservationExpiryNotifiesBothSides() {
        Reservation overdue = reservation("NOTIFYEXP1", LocalDateTime.now().minusMinutes(1), item(inventory(1), 2));

        assertThat(reservationService.expireOverdue(LocalDateTime.now())).isEqualTo(1);

        assertThat(notificationRepository.findByRecipientOrderByCreatedAtDesc(patient))
                .extracting(Notification::getMessageKey, Notification::getLink)
                .containsExactly(tuple("notify.reservation.expired", "/reservations/" + overdue.getId()));
        assertThat(notificationRepository.findByRecipientOrderByCreatedAtDesc(pharmacyUser))
                .extracting(Notification::getMessageKey, Notification::getLink)
                .containsExactly(tuple("notify.reservation.expired", "/pharmacy/reservations"));
    }

    @Test
    void expiredRequestNotifiesCustomer() {
        PrescriptionRequest overdue = request(LocalDateTime.now().minusMinutes(1));

        assertThat(prescriptionRequestService.expireOverdue(LocalDateTime.now())).isEqualTo(1);

        assertThat(notificationRepository.findByRecipientOrderByCreatedAtDesc(patient))
                .extracting(Notification::getMessageKey, Notification::getLink)
                .containsExactly(tuple("notify.prescription.expired", "/prescriptions/" + overdue.getId()));
        assertThat(notificationRepository.findByRecipientOrderByCreatedAtDesc(pharmacyUser)).isEmpty();
    }

    @Test
    void purgeDeletesOldClosedRequestImages() throws Exception {
        Path file = storedFile(image);
        PrescriptionRequest closed = request(LocalDateTime.now().plusDays(1));
        setStatusAndAge(closed, PrescriptionRequestStatus.CLOSED, 31);
        Image expiredImage = prescriptionImage();
        PrescriptionRequest expired = requestWithImage(expiredImage);
        setStatusAndAge(expired, PrescriptionRequestStatus.EXPIRED, 31);
        Path expiredFile = storedFile(expiredImage);

        try {
            assertThat(imageService.purgeOldPrescriptionImages(LocalDateTime.now())).isEqualTo(2);

            assertThat(file).doesNotExist();
            assertThat(expiredFile).doesNotExist();
            assertThat(imageRepository.findById(image.getId()).orElseThrow().getPurgedAt()).isNotNull();
            mockMvc.perform(get("/api/images/" + image.getId() + "/content")
                    .header("Authorization", "Bearer "
                        + jwtService.generateToken(patient.getId(), patient.getEmail(), patient.getRole())))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("IMAGE_PURGED"));
            assertThat(imageService.purgeOldPrescriptionImages(LocalDateTime.now())).isZero();
        } finally {
            Files.deleteIfExists(file);
            Files.deleteIfExists(expiredFile);
            transactionTemplate.executeWithoutResult(s -> {
                prescriptionRequestRepository.deleteById(expired.getId());
                prescriptionRequestRepository.flush();
                imageRepository.deleteById(expiredImage.getId());
            });
        }
    }

    @Test
    void purgeKeepsOpenAndRecentRequests() throws Exception {
        Path file = storedFile(image);
        PrescriptionRequest pendingOld = request(LocalDateTime.now().plusDays(1));
        setStatusAndAge(pendingOld, PrescriptionRequestStatus.PENDING, 90);
        Image recentImage = prescriptionImage();
        PrescriptionRequest closedRecent = requestWithImage(recentImage);
        setStatusAndAge(closedRecent, PrescriptionRequestStatus.CLOSED, 5);
        Path recentFile = storedFile(recentImage);

        try {
            assertThat(imageService.purgeOldPrescriptionImages(LocalDateTime.now())).isZero();

            assertThat(file).exists();
            assertThat(recentFile).exists();
            assertThat(imageRepository.findById(image.getId()).orElseThrow().getPurgedAt()).isNull();
            assertThat(imageRepository.findById(recentImage.getId()).orElseThrow().getPurgedAt()).isNull();
        } finally {
            Files.deleteIfExists(file);
            Files.deleteIfExists(recentFile);
            transactionTemplate.executeWithoutResult(s -> {
                prescriptionRequestRepository.deleteById(closedRecent.getId());
                prescriptionRequestRepository.flush();
                imageRepository.deleteById(recentImage.getId());
            });
        }
    }

    private Path storedFile(Image img) throws java.io.IOException {
        Path file = Path.of(img.getFilePath());
        Files.createDirectories(file.toAbsolutePath().getParent());
        Files.writeString(file, "fake image");
        return file;
    }

    private Image prescriptionImage() {
        String name = "ret-" + UUID.randomUUID() + ".webp";
        return imageRepository.save(Image.builder()
                .url("/x").originalFilename("x.png").generatedFilename(name)
                .filePath(uploadDir + "/" + name).mimeType("image/webp").imageType(ImageType.PRESCRIPTION)
                .build());
    }

    private PrescriptionRequest requestWithImage(Image img) {
        PrescriptionRequest saved = prescriptionRequestRepository.save(PrescriptionRequest.builder()
                .patient(patient).image(img).patientAge(30).targetScope(TargetScope.ALL)
                .consentAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusDays(1)).build());
        requestIds.add(saved.getId());
        return saved;
    }

    /** Sets status and backdates updated_at directly, since auditing overwrites it on every save. */
    private void setStatusAndAge(PrescriptionRequest request, PrescriptionRequestStatus status, int daysAgo) {
        jdbcTemplate.update("UPDATE prescription_requests SET status = ?, updated_at = ? WHERE id = ?",
                status.name(), java.sql.Timestamp.valueOf(LocalDateTime.now().minusDays(daysAgo)), request.getId());
    }

    private Inventory inventory(int stock) {
        Inventory saved = inventoryRepository.save(Inventory.builder()
                .medicineMaster(medicine)
                .pharmacy(pharmacy)
                .unitPrice(new BigDecimal("10.00"))
                .currency(Currency.LKR)
                .stockQuantity(stock)
                .expireDate(LocalDate.now().plusYears(1))
                .available(true)
                .build());
        inventoryIds.add(saved.getId());
        return saved;
    }

    private static ReservationItem item(Inventory inventory, int quantity) {
        return ReservationItem.builder()
                .inventoryItem(inventory)
                .quantity(quantity)
                .unitPrice(new BigDecimal("10.00"))
                .medicineName("Panadol 500mg")
                .build();
    }

    private Reservation reservation(String pickupCode, LocalDateTime expiresAt, ReservationItem... items) {
        Reservation reservation = Reservation.builder()
                .patient(patient)
                .pharmacy(pharmacy)
                .pickupCode(pickupCode)
                .expiresAt(expiresAt)
                .status(ReservationStatus.CONFIRMED)
                .build();
        for (ReservationItem item : items) {
            reservation.addItem(item);
        }
        return reservationRepository.save(reservation);
    }

    private PrescriptionRequest request(LocalDateTime expiresAt) {
        PrescriptionRequest saved = prescriptionRequestRepository.save(PrescriptionRequest.builder()
                .patient(patient)
                .image(image)
                .patientAge(30)
                .targetScope(TargetScope.ALL)
                .consentAt(LocalDateTime.now())
                .expiresAt(expiresAt)
                .build());
        requestIds.add(saved.getId());
        return saved;
    }

    private static User user(String email, Role role) {
        return User.builder().termsAcceptedAt(java.time.LocalDateTime.now())
                .name("Expiry User")
                .email(email)
                .phone("0770000000")
                .password("not-used-token-auth-only")
                .role(role)
                .build();
    }
}
