package com.suwalink.bootstrap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Category;
import com.suwalink.entity.District;
import com.suwalink.entity.Image;
import com.suwalink.entity.ImageType;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionResponse;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationItem;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.TargetScope;
import com.suwalink.entity.UnitOfMeasure;
import com.suwalink.entity.User;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.ImageRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.repository.PrescriptionResponseRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.security.JwtService;
import com.suwalink.service.DemoDataService;
import com.suwalink.service.PharmacyVisibilityService;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The demo dataset is committed (reset runs in its own transaction and is triggered over HTTP), so this
 * class is not {@code @Transactional}; {@link #cleanUp()} removes the demo data and the real fixtures.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DemoDataServiceTest {

    private static final String DEMO_PASSWORD = "DemoPass123!";
    private static final String CUSTOMER1 = "customer1@demo.suwalink.lk";
    private static final String PHARMACY1 = "pharmacy1@demo.suwalink.lk";

    @Autowired private DemoDataService demoDataService;
    @Autowired private PharmacyVisibilityService visibility;
    @Autowired private UserRepository userRepository;
    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private MedicineMasterRepository medicineMasterRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private PrescriptionRequestRepository prescriptionRequestRepository;
    @Autowired private PrescriptionResponseRepository prescriptionResponseRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private ImageRepository imageRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private TransactionTemplate tx;
    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private ApplicationContext context;

    private Manufacturer manufacturer;
    private Category category;
    private final List<MedicineMaster> catalog = new ArrayList<>();
    private MedicineMaster panadol;
    private User realOwner;
    private User realCustomer;
    private User admin;
    private Pharmacy realPharmacy;
    private Inventory realPanadol;
    private Image realImage;

    @BeforeEach
    void seedFixtures() {
        visibility.setDemoModePublic(false);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        manufacturer = manufacturerRepository.save(Manufacturer.builder()
                .name("DemoTest-" + suffix).country("Sri Lanka").isActive(true).build());
        category = categoryRepository.save(Category.builder().name("DemoTest-" + suffix).active(true).build());
        panadol = medicine("Panadol", "Paracetamol", "500mg", PrescriptionStatus.OTC);
        medicine("Amoxil", "Amoxicillin", "250mg", PrescriptionStatus.PRESCRIPTION);
        for (int i = 1; i <= 18; i++) {
            medicine("Demotest Med " + i, "Generic " + i, i + "mg",
                    i % 2 == 0 ? PrescriptionStatus.OTC : PrescriptionStatus.PRESCRIPTION);
        }

        realOwner = userRepository.save(user("real.owner." + suffix + "@example.com", Role.PHARMACY_OWNER));
        realCustomer = userRepository.save(user("real.customer." + suffix + "@example.com", Role.CUSTOMER));
        admin = userRepository.save(user("real.admin." + suffix + "@example.com", Role.ADMIN));
        realPharmacy = pharmacyRepository.save(Pharmacy.builder()
                .name("Real Pharmacy").phone("0112345678").district(District.COLOMBO).city("Colombo")
                .latitude(new BigDecimal("6.927100")).longitude(new BigDecimal("79.861200"))
                .licenceNo("LIC-REAL-" + suffix).address("1 Real Road").status(PharmacyStatus.VERIFIED)
                .user(realOwner).build());
        realPanadol = inventoryRepository.save(Inventory.builder()
                .medicineMaster(panadol).pharmacy(realPharmacy).unitPrice(new BigDecimal("10.00"))
                .expireDate(LocalDate.now().plusMonths(6)).stockQuantity(45).build());
        realImage = imageRepository.save(Image.builder()
                .url("/x").originalFilename("x.png").generatedFilename("real-" + suffix + ".webp")
                .filePath("uploads/real-" + suffix + ".webp").mimeType("image/webp")
                .imageType(ImageType.PRESCRIPTION).uploadedByUserId(realCustomer.getId()).build());
    }

    @AfterEach
    void cleanUp() {
        demoDataService.deleteDemoData();
        visibility.setDemoModePublic(false);
        tx.executeWithoutResult(status -> {
            reservationRepository.deleteAll(reservationRepository.findDistinctByPatientIdInOrPharmacyIdIn(
                    List.of(realCustomer.getId()), List.of(realPharmacy.getId())));
            prescriptionRequestRepository.deleteAll(
                    prescriptionRequestRepository.findByPatientIdIn(List.of(realCustomer.getId())));
            prescriptionRequestRepository.flush();
            imageRepository.deleteById(realImage.getId());
            notificationRepository.deleteAll(notificationRepository.findByRecipientIdIn(
                    List.of(realCustomer.getId(), realOwner.getId(), admin.getId())));
            inventoryRepository.deleteAll(inventoryRepository.findByPharmacyId(realPharmacy.getId()));
            inventoryRepository.flush();
            medicineMasterRepository.deleteAll(catalog);
            categoryRepository.deleteById(category.getId());
            manufacturerRepository.deleteById(manufacturer.getId());
            pharmacyRepository.deleteById(realPharmacy.getId());
            userRepository.deleteAll(List.of(realOwner, realCustomer, admin));
        });
    }

    @Test
    void seederIsDisabledInTheTestProfile() {
        assertThat(context.getBeansOfType(DemoDataSeeder.class)).isEmpty();
    }

    @Test
    void seedCreatesDemoDataset() {
        demoDataService.seedIfMissing();

        tx.executeWithoutResult(status -> {
            List<Pharmacy> pharmacies = pharmacyRepository.findByDemoTrue();
            assertThat(pharmacies).hasSize(7);
            assertThat(pharmacies.stream().collect(Collectors.groupingBy(Pharmacy::getDistrict, Collectors.counting())))
                    .isEqualTo(Map.of(District.COLOMBO, 2L, District.GAMPAHA, 2L, District.KANDY, 2L, District.GALLE, 1L));
            for (Pharmacy pharmacy : pharmacies) {
                assertThat(pharmacy.getStatus()).isEqualTo(PharmacyStatus.VERIFIED);
                assertThat(pharmacy.getUser().isDemo()).isTrue();
                List<Inventory> stock = inventoryRepository.findByPharmacyId(pharmacy.getId());
                assertThat(stock).hasSizeBetween(15, 20); // 20 approved medicines in this test catalog
                assertThat(stock).allSatisfy(i -> {
                    assertThat(i.getExpireDate()).isAfter(LocalDate.now());
                    assertThat(i.getUnitPrice()).isPositive();
                });
                assertThat(stock).anySatisfy(i -> assertThat(i.getMedicineMaster().getId()).isEqualTo(panadol.getId()));
            }
            assertThat(pharmacyRepository.findByDemoTrue().stream().map(p -> p.getUser().getEmail()))
                    .contains(PHARMACY1);

            List<User> demoCustomers = userRepository.findByDemoTrue().stream()
                    .filter(u -> u.getRole() == Role.CUSTOMER).toList();
            assertThat(demoCustomers).extracting(User::getEmail).containsExactlyInAnyOrder(
                    CUSTOMER1, "customer2@demo.suwalink.lk", "customer3@demo.suwalink.lk");

            User customer1 = userRepository.findByEmail(CUSTOMER1).orElseThrow();
            assertThat(passwordEncoder.matches(DEMO_PASSWORD, customer1.getPassword())).isTrue();
            List<PrescriptionRequest> requests = prescriptionRequestRepository.findByPatientIdOrderByCreatedAtDesc(customer1.getId());
            assertThat(requests).hasSize(1);
            PrescriptionRequest request = requests.get(0);
            assertThat(request.getTargetScope()).isEqualTo(TargetScope.DISTRICT);
            assertThat(request.getDistrict()).isEqualTo(District.COLOMBO);
            assertThat(request.getTargetPharmacies()).hasSize(2)
                    .allSatisfy(p -> assertThat(p.getDistrict()).isEqualTo(District.COLOMBO));
            assertThat(request.getImage().getUrl()).isEqualTo("/api/images/" + request.getImage().getId() + "/content");
            assertThat(Files.isRegularFile(Path.of(request.getImage().getFilePath()))).isTrue();

            List<PrescriptionResponse> responses =
                    prescriptionResponseRepository.findByPrescriptionRequestIdOrderByCreatedAtDesc(request.getId());
            assertThat(responses).hasSize(1);
            assertThat(responses.get(0).getPharmacy().getDistrict()).isEqualTo(District.COLOMBO);
            assertThat(responses.get(0).getItems()).isNotEmpty();

            List<Reservation> reservations = reservationRepository.findByPatientIdOrderByCreatedAtDesc(customer1.getId());
            assertThat(reservations).extracting(Reservation::getStatus).containsExactlyInAnyOrder(
                    ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED, ReservationStatus.CANCELLED);
            assertThat(reservations).allSatisfy(r -> assertThat(r.isDemo()).isTrue());
            Reservation confirmed = reservations.stream()
                    .filter(r -> r.getStatus() == ReservationStatus.CONFIRMED).findFirst().orElseThrow();
            assertThat(confirmed.getPrescriptionRequest().getId()).isEqualTo(request.getId());
            assertThat(confirmed.getItems()).allSatisfy(i -> assertThat(i.getPrescriptionResponseItem()).isNotNull());
            assertThat(confirmed.getExpiresAt()).isBetween(
                    LocalDateTime.now().plusHours(23), LocalDateTime.now().plusHours(25));
        });
    }

    @Test
    void seedIsIdempotent() {
        demoDataService.seedIfMissing();
        long pharmacies = pharmacyRepository.count();
        long users = userRepository.count();
        long inventory = inventoryRepository.count();
        long reservations = reservationRepository.count();

        demoDataService.seedIfMissing();

        assertThat(pharmacyRepository.count()).isEqualTo(pharmacies);
        assertThat(userRepository.count()).isEqualTo(users);
        assertThat(inventoryRepository.count()).isEqualTo(inventory);
        assertThat(reservationRepository.count()).isEqualTo(reservations);
    }

    @Test
    void demoHiddenUntilDemoModeOn() throws Exception {
        demoDataService.seedIfMissing();

        assertThat(panadolPharmacyCount()).isEqualTo(1);
        visibility.setDemoModePublic(true);
        assertThat(panadolPharmacyCount()).isEqualTo(8);
    }

    @Test
    void resetRecreatesAndKeepsRealDataIntact() throws Exception {
        demoDataService.seedIfMissing();
        visibility.setDemoModePublic(true);
        Set<UUID> demoPharmaciesBefore = demoPharmacyIds();
        User customer1 = userRepository.findByEmail(CUSTOMER1).orElseThrow();
        Pharmacy demoColombo = tx.execute(status -> pharmacyRepository.findByDemoTrue().stream()
                .filter(p -> p.getDistrict() == District.COLOMBO).findFirst().orElseThrow());
        Inventory demoStock = inventoryRepository.findByPharmacyId(demoColombo.getId()).get(0);

        // stock 45 already reflects nothing held; holds below decrement it as a reservation would
        Reservation realHold = reservation(realCustomer, realPharmacy, realPanadol, 5);
        Reservation demoHoldAtReal = reservation(customer1, realPharmacy, realPanadol, 3);
        setStock(realPanadol, 45 - 5 - 3);
        Reservation realAtDemo = reservation(realCustomer, demoColombo, demoStock, 2);
        PrescriptionRequest realRequest = prescriptionRequestRepository.save(PrescriptionRequest.builder()
                .patient(realCustomer).image(realImage).patientAge(40).targetScope(TargetScope.DISTRICT)
                .district(District.COLOMBO).consentAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusDays(7))
                .targetPharmacies(new HashSet<>(List.of(realPharmacy, demoColombo))).build());

        mockMvc.perform(post("/api/admin/demo/reset")
                        .header("Authorization", "Bearer " + jwtService.generateToken(admin.getId(), admin.getEmail(), Role.ADMIN)))
                .andExpect(status().isOk());

        Set<UUID> demoPharmaciesAfter = demoPharmacyIds();
        assertThat(demoPharmaciesAfter).hasSize(7).doesNotContainAnyElementsOf(demoPharmaciesBefore);
        assertThat(reservationRepository.findById(realHold.getId())).get()
                .extracting(Reservation::getStatus).isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(reservationRepository.findById(demoHoldAtReal.getId())).isEmpty();
        assertThat(reservationRepository.findById(realAtDemo.getId())).isEmpty();
        assertThat(inventoryRepository.findById(realPanadol.getId()).orElseThrow().getStockQuantity())
                .isEqualTo(45 - 5); // the demo customer's 3 went back, the real hold stays
        tx.executeWithoutResult(status -> assertThat(prescriptionRequestRepository.findById(realRequest.getId())
                .orElseThrow().getTargetPharmacies()).extracting(Pharmacy::getId).containsExactly(realPharmacy.getId()));
        assertThat(pharmacyRepository.findById(realPharmacy.getId())).isPresent();
        assertThat(userRepository.findById(realCustomer.getId())).isPresent();
        assertThat(imageRepository.findById(realImage.getId())).isPresent();
    }

    @Test
    void resetTwiceIsSafe() {
        demoDataService.seedIfMissing();
        Path firstImage = demoPrescriptionImage();

        demoDataService.reset();
        demoDataService.reset();

        assertThat(demoPharmacyIds()).hasSize(7);
        assertThat(userRepository.findByDemoTrue()).hasSize(10);
        assertThat(Files.exists(firstImage)).isFalse();
        assertThat(Files.isRegularFile(demoPrescriptionImage())).isTrue();
    }

    @Test
    void demoAccountsCanLogInWhenOn() throws Exception {
        demoDataService.seedIfMissing();
        visibility.setDemoModePublic(true);

        assertThat(login(CUSTOMER1)).isEqualTo(200);
        assertThat(login(PHARMACY1)).isEqualTo(200);

        visibility.setDemoModePublic(false);
        assertThat(login(CUSTOMER1)).isEqualTo(403);
    }

    private int panadolPharmacyCount() throws Exception {
        String body = mockMvc.perform(get("/api/medicines/search").param("q", "panadol"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<Integer> counts = JsonPath.read(body,
                "$.data.content[?(@.medicineId == '" + panadol.getId() + "')].pharmacyCount");
        return counts.isEmpty() ? 0 : counts.get(0);
    }

    private int login(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, DEMO_PASSWORD)))
                .andReturn().getResponse().getStatus();
    }

    private Set<UUID> demoPharmacyIds() {
        return pharmacyRepository.findByDemoTrue().stream().map(Pharmacy::getId).collect(Collectors.toSet());
    }

    private Path demoPrescriptionImage() {
        return tx.execute(status -> {
            User customer1 = userRepository.findByEmail(CUSTOMER1).orElseThrow();
            return Path.of(prescriptionRequestRepository.findByPatientIdOrderByCreatedAtDesc(customer1.getId())
                    .get(0).getImage().getFilePath());
        });
    }

    private Reservation reservation(User patient, Pharmacy pharmacy, Inventory inventory, int quantity) {
        Reservation reservation = Reservation.builder().patient(patient).pharmacy(pharmacy)
                .pickupCode(UUID.randomUUID().toString().substring(0, 10).toUpperCase())
                .expiresAt(LocalDateTime.now().plusHours(24)).status(ReservationStatus.CONFIRMED)
                .demo(pharmacy.isDemo()).build();
        reservation.addItem(ReservationItem.builder().inventoryItem(inventory).quantity(quantity)
                .unitPrice(inventory.getUnitPrice()).medicineName("Panadol 500mg").requiresPrescription(false).build());
        return reservationRepository.save(reservation);
    }

    private void setStock(Inventory inventory, int stock) {
        tx.executeWithoutResult(status -> inventoryRepository.findById(inventory.getId()).orElseThrow()
                .setStockQuantity(stock));
    }

    private MedicineMaster medicine(String brand, String generic, String strength, PrescriptionStatus legal) {
        MedicineMaster medicine = medicineMasterRepository.save(MedicineMaster.builder()
                .brandName(brand).genericName(generic).dosageForm("Tablet").strength(strength)
                .unitOfMeasure(UnitOfMeasure.TABLET).manufacturer(manufacturer).therapeuticCategory(category)
                .legalCategory(legal).build());
        catalog.add(medicine);
        return medicine;
    }

    private User user(String email, Role role) {
        return User.builder().name("Real " + role).email(email).phone("0771234567")
                .password(passwordEncoder.encode("SecurePass123")).role(role)
                .termsAcceptedAt(LocalDateTime.now()).build();
    }
}
