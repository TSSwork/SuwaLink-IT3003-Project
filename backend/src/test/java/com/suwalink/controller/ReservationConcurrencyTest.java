package com.suwalink.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.suwalink.entity.Category;
import com.suwalink.entity.Currency;
import com.suwalink.entity.District;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Manufacturer;
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
import com.suwalink.security.JwtService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Two customers race for the last unit. Not {@code @Transactional}: each request must commit in its
 * own transaction for the row lock to matter, so the seeded rows are removed in {@link #cleanUp()}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReservationConcurrencyTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private MedicineMasterRepository medicineMasterRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private TransactionTemplate transactionTemplate;

    private final List<User> customers = new ArrayList<>();
    private User pharmacyUser;
    private Pharmacy pharmacy;
    private Manufacturer manufacturer;
    private Category category;
    private MedicineMaster medicine;
    private Inventory inventory;

    @BeforeEach
    void seed() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        pharmacyUser = userRepository.save(user("race.pharmacy." + suffix + "@example.com", Role.PHARMACY_OWNER));
        for (int i = 0; i < 2; i++) {
            customers.add(userRepository.save(user("race.customer" + i + "." + suffix + "@example.com", Role.CUSTOMER)));
        }
        pharmacy = pharmacyRepository.save(Pharmacy.builder()
                .name("Race Pharmacy")
                .phone("0112345678")
                .district(District.COLOMBO)
                .city("Colombo")
                .latitude(new BigDecimal("6.927100"))
                .longitude(new BigDecimal("79.861200"))
                .licenceNo("LIC-RACE-" + suffix)
                .address("1 Race Road")
                .status(PharmacyStatus.VERIFIED)
                .user(pharmacyUser)
                .build());
        manufacturer = manufacturerRepository.save(Manufacturer.builder()
                .name("Race-" + suffix).country("Sri Lanka").isActive(true).build());
        category = categoryRepository.save(Category.builder().name("Race-" + suffix).active(true).build());
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
        inventory = inventoryRepository.save(Inventory.builder()
                .medicineMaster(medicine)
                .pharmacy(pharmacy)
                .unitPrice(new BigDecimal("10.00"))
                .currency(Currency.LKR)
                .stockQuantity(1)
                .expireDate(LocalDate.now().plusYears(1))
                .available(true)
                .build());
    }

    @AfterEach
    void cleanUp() {
        transactionTemplate.executeWithoutResult(status -> deleteSeededRows());
    }

    private void deleteSeededRows() {
        reservationRepository.deleteByPharmacyId(pharmacy.getId());
        notificationRepository.deleteByRecipient_Id(pharmacyUser.getId());
        customers.forEach(c -> notificationRepository.deleteByRecipient_Id(c.getId()));
        inventoryRepository.deleteById(inventory.getId());
        medicineMasterRepository.deleteById(medicine.getId());
        categoryRepository.deleteById(category.getId());
        manufacturerRepository.deleteById(manufacturer.getId());
        pharmacyRepository.deleteById(pharmacy.getId());
        customers.forEach(c -> userRepository.deleteById(c.getId()));
        userRepository.deleteById(pharmacyUser.getId());
    }

    @Test
    void lastUnitCanOnlyBeReservedOnce() throws Exception {
        String body = """
            { "lines": [ { "inventoryItemId": "%s", "quantity": 1 } ] }
            """.formatted(inventory.getId());
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<Integer>> results = new ArrayList<>();
            for (User customer : customers) {
                String token = jwtService.generateToken(customer.getId(), customer.getEmail(), customer.getRole());
                results.add(executor.submit(() -> {
                    start.await();
                    return mockMvc.perform(post("/api/reservations")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .header("Authorization", "Bearer " + token)
                                    .content(body))
                            .andReturn().getResponse().getStatus();
                }));
            }
            start.countDown();

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> result : results) {
                statuses.add(result.get(30, TimeUnit.SECONDS));
            }
            assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        } finally {
            executor.shutdownNow();
        }

        assertThat(inventoryRepository.findById(inventory.getId()).orElseThrow().getStockQuantity()).isZero();
        assertThat(reservationRepository.findByPharmacyIdOrderByCreatedAtDesc(pharmacy.getId())).hasSize(1);
    }

    private static User user(String email, Role role) {
        return User.builder()
                .name("Race User")
                .email(email)
                .phone("0770000000")
                .password("not-used-token-auth-only")
                .role(role)
                .build();
    }
}
