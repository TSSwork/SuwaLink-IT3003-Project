package com.suwalink.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Bookmark;
import com.suwalink.entity.CancelledBy;
import com.suwalink.entity.Category;
import com.suwalink.entity.Currency;
import com.suwalink.entity.Image;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.UnitOfMeasure;
import com.suwalink.entity.User;
import com.suwalink.repository.BookmarkRepository;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.PharmacyVisibilityService;
import com.suwalink.support.TestPayloads;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AccountLifecycleTest {

    private static final String PASSWORD = "SecurePass123";
    private static final String ADMIN_EMAIL = "acct.admin@suwalink.local";
    private static final String OTHER_ADMIN_EMAIL = "acct.admin2@suwalink.local";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private MedicineMasterRepository medicineMasterRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private PrescriptionRequestRepository prescriptionRequestRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private BookmarkRepository bookmarkRepository;
    @Autowired private PharmacyVisibilityService visibility;

    @BeforeEach
    void createAdmins() {
        saveUser(ADMIN_EMAIL, Role.ADMIN, false);
        saveUser(OTHER_ADMIN_EMAIL, Role.ADMIN, false);
    }

    @Test
    void customerDeletesOwnAccount() throws Exception {
        String email = "acct.del.customer@example.com";
        String customerToken = registerCustomerAndLogin(email);
        UUID customerId = userId(email);
        String pharmacyEmail = "acct.del.customer.pharmacy@example.com";
        String ownerToken = registerVerifiedPharmacyAndLogin(pharmacyEmail, "LIC-AD-C1");
        UUID inventoryId = createInventoryItem(pharmacyEmail, 10);

        String reservationId = reserve(customerToken, inventoryId, 3);
        assertThat(inventoryRepository.findById(inventoryId).orElseThrow().getStockQuantity()).isEqualTo(7);
        assertThat(ownerNotifications(ownerToken)).contains("Test Customer");
        String requestId = createPrescription(customerToken,
            TestPayloads.prescriptionTargetRadius("6.927100", "79.861200"), "Private note");
        String districtRequestId = createPrescription(customerToken,
            TestPayloads.prescriptionTargetDistrict("COLOMBO"), "Another note");
        PrescriptionRequest request = prescriptionRequestRepository.findById(UUID.fromString(requestId)).orElseThrow();
        assertThat(request.getNote()).isEqualTo("Private note");
        assertThat(request.getLatitude()).isNotNull();
        Image image = request.getImage();
        Path imageFile = Path.of(image.getFilePath());
        assertThat(Files.exists(imageFile)).isTrue();
        bookmarkRepository.save(Bookmark.builder()
            .user(userRepository.findById(customerId).orElseThrow())
            .inventory(inventoryRepository.findById(inventoryId).orElseThrow())
            .build());
        assertThat(notificationRepository.findAll()).anyMatch(n -> n.getRecipient().getId().equals(customerId));

        deleteMe(customerToken, "WrongPass999")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_PASSWORD"));
        deleteMe(customerToken, PASSWORD).andExpect(status().isOk());

        login(email, PASSWORD).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + customerToken))
            .andExpect(status().isUnauthorized());

        Reservation reservation = reservationRepository.findById(UUID.fromString(reservationId)).orElseThrow();
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
        assertThat(reservation.getCancelledBy()).isEqualTo(CancelledBy.PATIENT);
        assertThat(reservation.getCancelReason()).isEqualTo("Account deleted");
        assertThat(inventoryRepository.findById(inventoryId).orElseThrow().getStockQuantity()).isEqualTo(10);

        for (String id : new String[] {requestId, districtRequestId}) {
            PrescriptionRequest closed = prescriptionRequestRepository.findById(UUID.fromString(id)).orElseThrow();
            assertThat(closed.getStatus()).isEqualTo(PrescriptionRequestStatus.CLOSED);
            assertThat(closed.getNote()).isNull();
            assertThat(closed.getLatitude()).isNull();
            assertThat(closed.getLongitude()).isNull();
            assertThat(closed.getDistrict()).isNull();
        }
        mockMvc.perform(get("/api/prescriptions/" + districtRequestId).header("Authorization", bearer(adminToken())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.note").doesNotExist())
            .andExpect(jsonPath("$.data.district").doesNotExist())
            .andExpect(jsonPath("$.data.patientName").value("Deleted user"));

        // The pharmacy's notifications (new reservation, cancelled by customer) no longer name the customer.
        String ownerNotificationsAfter = ownerNotifications(ownerToken);
        assertThat(ownerNotificationsAfter).doesNotContain("Test Customer").contains("Deleted user");
        assertThat(Files.exists(imageFile)).isFalse();
        assertThat(image.getPurgedAt()).isNotNull();

        assertThat(notificationRepository.findAll()).noneMatch(n -> n.getRecipient().getId().equals(customerId));
        assertThat(bookmarkRepository.findByUserIdOrderByCreatedAtDesc(customerId)).isEmpty();

        User deleted = userRepository.findById(customerId).orElseThrow();
        assertThat(deleted.getName()).isEqualTo("Deleted user");
        assertThat(deleted.getEmail()).isEqualTo("deleted-" + customerId + "@deleted.suwalink.invalid");
        assertThat(deleted.getPhone()).isEqualTo("0000000000");
        assertThat(deleted.getDeletedAt()).isNotNull();
        assertThat(passwordEncoder.matches(PASSWORD, deleted.getPassword())).isFalse();
    }

    @Test
    void oldTokenStopsWorkingWhenDeletedUsersEmailIsRegisteredAgain() throws Exception {
        String email = "acct.reused.email@example.com";
        String oldToken = registerCustomerAndLogin(email);
        deleteMe(oldToken, PASSWORD).andExpect(status().isOk());

        String newToken = registerCustomerAndLogin(email);

        mockMvc.perform(get("/api/users/me").header("Authorization", bearer(oldToken)))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users/me").header("Authorization", bearer(newToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value(email));
    }

    @Test
    void ownerWithOpenReservationCannotDelete() throws Exception {
        String pharmacyEmail = "acct.owner.open@example.com";
        String ownerToken = registerVerifiedPharmacyAndLogin(pharmacyEmail, "LIC-AD-O1");
        UUID inventoryId = createInventoryItem(pharmacyEmail, 5);
        String customerToken = registerCustomerAndLogin("acct.owner.open.customer@example.com");
        reserve(customerToken, inventoryId, 1);

        deleteMe(ownerToken, PASSWORD)
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("OPEN_RESERVATIONS"))
            .andExpect(jsonPath("$.message").value("Complete or cancel open reservations first"));
        mockMvc.perform(delete("/api/admin/users/" + userId(pharmacyEmail)).header("Authorization", bearer(adminToken())))
            .andExpect(status().isConflict());

        assertThat(pharmacyOf(pharmacyEmail).getStatus()).isEqualTo(PharmacyStatus.VERIFIED);
    }

    @Test
    void ownerDeletionDeactivatesPharmacy() throws Exception {
        String pharmacyEmail = "acct.owner.del@example.com";
        String ownerToken = registerVerifiedPharmacyAndLogin(pharmacyEmail, "LIC-AD-O2");
        UUID inventoryId = createInventoryItem(pharmacyEmail, 5);
        UUID medicineId = inventoryRepository.findById(inventoryId).orElseThrow().getMedicineMaster().getId();
        UUID pharmacyId = pharmacyOf(pharmacyEmail).getId();
        UUID ownerId = userId(pharmacyEmail);

        String customerToken = registerCustomerAndLogin("acct.owner.del.customer@example.com");
        String requestId = createPrescription(customerToken);
        mockMvc.perform(post("/api/prescriptions/" + requestId + "/responses")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", bearer(ownerToken))
                .content("""
                    { "items": [ { "inventoryItemId": "%s", "quantity": 1 } ] }
                    """.formatted(inventoryId)))
            .andExpect(status().isCreated());
        mockMvc.perform(get("/api/medicines/" + medicineId + "/offers"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].pharmacy.id", hasItem(pharmacyId.toString())));

        deleteMe(ownerToken, PASSWORD).andExpect(status().isOk());

        Pharmacy pharmacy = pharmacyOf(pharmacyId);
        assertThat(pharmacy.getStatus()).isEqualTo(PharmacyStatus.DEACTIVATED);
        assertThat(inventoryRepository.findByPharmacyId(pharmacyId)).allMatch(i -> !i.isAvailable());
        User owner = userRepository.findById(ownerId).orElseThrow();
        assertThat(owner.getName()).isEqualTo("Deleted user");
        assertThat(owner.getEmail()).isEqualTo("deleted-" + ownerId + "@deleted.suwalink.invalid");
        assertThat(owner.getDeletedAt()).isNotNull();

        mockMvc.perform(get("/api/medicines/" + medicineId + "/offers"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].pharmacy.id", not(hasItem(pharmacyId.toString()))));
        mockMvc.perform(get("/api/pharmacies/" + pharmacyId)).andExpect(status().isNotFound());
        login(pharmacyEmail, PASSWORD).andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/prescriptions/" + requestId + "/responses").header("Authorization", bearer(customerToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].pharmacyName").value("Test Pharmacy"))
            .andExpect(jsonPath("$.data[0].pharmacyActive").value(false));
    }

    @Test
    void suspendedOwnersPharmacyIsNotPublic() throws Exception {
        String admin = adminToken();
        String pharmacyEmail = "acct.susp.owner@example.com";
        registerVerifiedPharmacyAndLogin(pharmacyEmail, "LIC-AD-S1");
        registerVerifiedPharmacyAndLogin("acct.susp.other@example.com", "LIC-AD-S2"); // keeps ALL in scope
        UUID inventoryId = createInventoryItem(pharmacyEmail, 5);
        UUID medicineId = inventoryRepository.findById(inventoryId).orElseThrow().getMedicineMaster().getId();
        UUID pharmacyId = pharmacyOf(pharmacyEmail).getId();
        UUID ownerId = userId(pharmacyEmail);
        String customerToken = registerCustomerAndLogin("acct.susp.customer@example.com");

        mockMvc.perform(put("/api/admin/users/" + ownerId + "/suspend").header("Authorization", bearer(admin)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/medicines/" + medicineId + "/offers"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].pharmacy.id", not(hasItem(pharmacyId.toString()))));
        mockMvc.perform(get("/api/medicines/search").param("q", "panadol"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[*].medicineId", not(hasItem(medicineId.toString()))));
        mockMvc.perform(get("/api/pharmacies/" + pharmacyId)).andExpect(status().isNotFound());
        String requestId = createPrescription(customerToken);
        assertThat(prescriptionRequestRepository.findById(UUID.fromString(requestId)).orElseThrow()
            .getTargetPharmacies()).extracting(Pharmacy::getId).doesNotContain(pharmacyId).isNotEmpty();
        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", bearer(customerToken))
                .content("""
                    { "lines": [ { "inventoryItemId": "%s", "quantity": 1 } ] }
                    """.formatted(inventoryId)))
            .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/admin/users/" + ownerId + "/reactivate").header("Authorization", bearer(admin)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/medicines/" + medicineId + "/offers"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].pharmacy.id", hasItem(pharmacyId.toString())));
        mockMvc.perform(get("/api/medicines/search").param("q", "panadol"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[*].medicineId", hasItem(medicineId.toString())));
        mockMvc.perform(get("/api/pharmacies/" + pharmacyId)).andExpect(status().isOk());
        reserve(customerToken, inventoryId, 1);
    }

    @Test
    void adminCannotDeleteSelfOrAnotherAdmin() throws Exception {
        String admin = adminToken();

        deleteMe(admin, PASSWORD)
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ACCOUNT_ACTION_NOT_ALLOWED"));
        mockMvc.perform(delete("/api/admin/users/" + userId(ADMIN_EMAIL)).header("Authorization", bearer(admin)))
            .andExpect(status().isConflict());
        mockMvc.perform(delete("/api/admin/users/" + userId(OTHER_ADMIN_EMAIL)).header("Authorization", bearer(admin)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ACCOUNT_ACTION_NOT_ALLOWED"));
        mockMvc.perform(put("/api/admin/users/" + userId(OTHER_ADMIN_EMAIL) + "/suspend").header("Authorization", bearer(admin)))
            .andExpect(status().isConflict());

        assertThat(userRepository.findByEmail(OTHER_ADMIN_EMAIL)).get()
            .satisfies(u -> assertThat(u.getDeletedAt()).isNull())
            .satisfies(u -> assertThat(u.isSuspended()).isFalse());
    }

    @Test
    void adminSuspendsAndReactivates() throws Exception {
        String admin = adminToken();
        String email = "acct.suspend.customer@example.com";
        String customerToken = registerCustomerAndLogin(email);
        UUID customerId = userId(email);

        mockMvc.perform(put("/api/admin/users/" + customerId + "/suspend").header("Authorization", bearer(admin)))
            .andExpect(status().isOk());

        login(email, PASSWORD)
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"))
            .andExpect(jsonPath("$.message").value("Your account has been suspended"));
        mockMvc.perform(get("/api/users/me").header("Authorization", bearer(customerToken)))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/admin/users/" + customerId + "/reactivate").header("Authorization", bearer(admin)))
            .andExpect(status().isOk());
        login(email, PASSWORD).andExpect(status().isOk());
    }

    @Test
    void adminUserListFiltersByStatusAndQuery() throws Exception {
        String admin = adminToken();
        String activeEmail = "acct.list.active@example.com";
        String suspendedEmail = "acct.list.suspended@example.com";
        String deletedEmail = "acct.list.deleted@example.com";
        registerCustomerAndLogin(activeEmail);
        registerCustomerAndLogin(suspendedEmail);
        registerCustomerAndLogin(deletedEmail);
        UUID suspendedId = userId(suspendedEmail);
        UUID deletedId = userId(deletedEmail);
        mockMvc.perform(put("/api/admin/users/" + suspendedId + "/suspend").header("Authorization", bearer(admin)))
            .andExpect(status().isOk());
        mockMvc.perform(delete("/api/admin/users/" + deletedId).header("Authorization", bearer(admin)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/users").param("q", "acct.list").header("Authorization", bearer(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.data[*].email", hasItem(activeEmail)))
            .andExpect(jsonPath("$.data[*].email", hasItem(suspendedEmail)))
            .andExpect(jsonPath("$.data[*].id", not(hasItem(deletedId.toString()))));

        mockMvc.perform(get("/api/admin/users").param("status", "SUSPENDED").header("Authorization", bearer(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].email").value(suspendedEmail))
            .andExpect(jsonPath("$.data[0].status").value("SUSPENDED"));

        mockMvc.perform(get("/api/admin/users").param("status", "DELETED").header("Authorization", bearer(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].id").value(deletedId.toString()))
            .andExpect(jsonPath("$.data[0].status").value("DELETED"));

        mockMvc.perform(get("/api/admin/users").param("q", "ACCT.LIST.ACTIVE").param("status", "ACTIVE")
                .header("Authorization", bearer(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].email").value(activeEmail))
            .andExpect(jsonPath("$.data[0].status").value("ACTIVE"));
    }

    @Test
    void demoAndSuspendedMessagesDiffer() throws Exception {
        visibility.setDemoModePublic(false);
        saveUser("acct.demo.user@example.com", Role.CUSTOMER, true);
        String email = "acct.demo.suspended@example.com";
        registerCustomerAndLogin(email);
        mockMvc.perform(put("/api/admin/users/" + userId(email) + "/suspend").header("Authorization", bearer(adminToken())))
            .andExpect(status().isOk());

        login("acct.demo.user@example.com", PASSWORD)
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("DEMO_DISABLED"))
            .andExpect(jsonPath("$.message").value("Demo accounts are currently disabled"));
        login(email, PASSWORD)
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"))
            .andExpect(jsonPath("$.message").value("Your account has been suspended"));
    }

    @Test
    void deletingRequestWithReservationsIs409() throws Exception {
        String pharmacyEmail = "acct.reqdel.pharmacy@example.com";
        String ownerToken = registerVerifiedPharmacyAndLogin(pharmacyEmail, "LIC-AD-R1");
        UUID inventoryId = createInventoryItem(pharmacyEmail, 5);
        String customerToken = registerCustomerAndLogin("acct.reqdel.customer@example.com");
        String requestId = createPrescription(customerToken);
        mockMvc.perform(post("/api/prescriptions/" + requestId + "/responses")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", bearer(ownerToken))
                .content("""
                    { "items": [ { "inventoryItemId": "%s", "quantity": 2 } ] }
                    """.formatted(inventoryId)))
            .andExpect(status().isCreated());
        MvcResult responses = mockMvc.perform(get("/api/prescriptions/" + requestId + "/responses")
                .header("Authorization", bearer(customerToken)))
            .andExpect(status().isOk())
            .andReturn();
        String responseItemId = JsonPath.read(responses.getResponse().getContentAsString(), "$.data[0].items[0].id");
        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", bearer(customerToken))
                .content("""
                    { "lines": [ { "inventoryItemId": "%s", "quantity": 1, "prescriptionResponseItemId": "%s" } ] }
                    """.formatted(inventoryId, responseItemId)))
            .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/prescriptions/" + requestId).header("Authorization", bearer(customerToken)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("REQUEST_HAS_RESERVATIONS"))
            .andExpect(jsonPath("$.message").value("This request has reservations and can't be deleted; close it instead"));
        assertThat(prescriptionRequestRepository.findById(UUID.fromString(requestId))).isPresent();
    }

    // --- helpers ---------------------------------------------------------------------------------

    private void saveUser(String email, Role role, boolean demo) {
        if (userRepository.findByEmail(email).isPresent()) {
            return;
        }
        userRepository.save(User.builder().termsAcceptedAt(LocalDateTime.now())
            .name("Test " + role).email(email).phone("0771234567")
            .password(passwordEncoder.encode(PASSWORD)).role(role).demo(demo).build());
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private String adminToken() throws Exception {
        return token(ADMIN_EMAIL);
    }

    private UUID userId(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    private Pharmacy pharmacyOf(String ownerEmail) {
        return pharmacyRepository.findByUserId(userId(ownerEmail)).orElseThrow();
    }

    private Pharmacy pharmacyOf(UUID pharmacyId) {
        return pharmacyRepository.findById(pharmacyId).orElseThrow();
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }

    private String token(String email) throws Exception {
        MvcResult result = login(email, PASSWORD).andExpect(status().isOk()).andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.token");
    }

    private ResultActions deleteMe(String token, String password) throws Exception {
        return mockMvc.perform(delete("/api/users/me")
            .header("Authorization", bearer(token))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"password\":\"%s\"}".formatted(password)));
    }

    private String registerCustomerAndLogin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.customerRegistration(email)))
            .andExpect(status().isCreated());
        return token(email);
    }

    private String registerVerifiedPharmacyAndLogin(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
            .andExpect(status().isCreated());
        Pharmacy pharmacy = pharmacyOf(email);
        pharmacy.setStatus(PharmacyStatus.VERIFIED);
        pharmacyRepository.save(pharmacy);
        return token(email);
    }

    private UUID createInventoryItem(String pharmacyEmail, int stockQuantity) {
        Manufacturer manufacturer = manufacturerRepository.save(Manufacturer.builder()
            .name("Acme-" + UUID.randomUUID()).country("Sri Lanka").isActive(true).build());
        Category category = categoryRepository.save(Category.builder()
            .name("Category-" + UUID.randomUUID()).active(true).build());
        MedicineMaster medicine = medicineMasterRepository.save(MedicineMaster.builder()
            .brandName("Panadol").genericName("Paracetamol").dosageForm("Tablet").strength("500mg")
            .unitOfMeasure(UnitOfMeasure.TABLET).manufacturer(manufacturer).therapeuticCategory(category)
            .legalCategory(PrescriptionStatus.OTC).build());
        Inventory inventory = inventoryRepository.save(Inventory.builder()
            .medicineMaster(medicine).pharmacy(pharmacyOf(pharmacyEmail))
            .unitPrice(new BigDecimal("10.00")).currency(Currency.LKR).stockQuantity(stockQuantity)
            .expireDate(LocalDate.now().plusYears(1)).available(true).build());
        return inventory.getId();
    }

    private String reserve(String customerToken, UUID inventoryId, int quantity) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", bearer(customerToken))
                .content("""
                    { "lines": [ { "inventoryItemId": "%s", "quantity": %d } ] }
                    """.formatted(inventoryId, quantity)))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private String ownerNotifications(String ownerToken) throws Exception {
        return mockMvc.perform(get("/api/notifications").header("Authorization", bearer(ownerToken)))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String createPrescription(String customerToken) throws Exception {
        return createPrescription(customerToken, TestPayloads.prescriptionTargetAll(), null);
    }

    private String createPrescription(
            String customerToken, org.springframework.test.web.servlet.request.RequestPostProcessor target, String note)
            throws Exception {
        BufferedImage image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        MvcResult result = mockMvc.perform(multipart("/api/prescriptions")
                .file(new MockMultipartFile("image", "p.png", MediaType.IMAGE_PNG_VALUE, out.toByteArray()))
                .with(target)
                .with(request -> {
                    if (note != null) {
                        request.setParameter("note", note);
                    }
                    return request;
                })
                .param("patientAge", "30")
                .header("Authorization", bearer(customerToken)))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }
}
