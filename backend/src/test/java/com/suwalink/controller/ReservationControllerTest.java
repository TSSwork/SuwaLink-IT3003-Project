package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Category;
import com.suwalink.entity.Currency;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.UnitOfMeasure;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.PharmacyRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Autowired
    private ManufacturerRepository manufacturerRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private MedicineMasterRepository medicineMasterRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Test
    void create_asPatient_confirmsAndDecrementsStock() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.patient1@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.pharmacy1@example.com", "LIC-V-1");
        UUID inventoryId = createInventoryItem("resv.pharmacy1@example.com", new BigDecimal("100.00"), 10);

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + patientToken)
                        .content("""
                            { "inventoryItemId": "%s", "quantity": 3 }
                            """.formatted(inventoryId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.quantity").value(3));

        mockMvc.perform(get("/api/inventory/" + inventoryId).header("Authorization", "Bearer " + pharmacyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stockQuantity").value(7));
    }

    @Test
    void create_withInsufficientStock_isBadRequest() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.patient2@example.com");
        registerVerifiedPharmacyAndLogin("resv.pharmacy2@example.com", "LIC-V-2");
        UUID inventoryId = createInventoryItem("resv.pharmacy2@example.com", new BigDecimal("50.00"), 2);

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + patientToken)
                        .content("""
                            { "inventoryItemId": "%s", "quantity": 5 }
                            """.formatted(inventoryId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cancel_byPatient_restocksInventory() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.patient3@example.com");
        registerVerifiedPharmacyAndLogin("resv.pharmacy3@example.com", "LIC-V-3");
        UUID inventoryId = createInventoryItem("resv.pharmacy3@example.com", new BigDecimal("20.00"), 5);

        String reservationId = createReservation(patientToken, inventoryId, 2);

        mockMvc.perform(patch("/api/reservations/" + reservationId + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + patientToken)
                        .content("{ \"reason\": \"Changed my mind\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        mockMvc.perform(get("/api/reservations/me").header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].status").value("CANCELLED"));
    }

    @Test
    void cancel_byStranger_isForbidden() throws Exception {
        String owner = registerCustomerAndLogin("resv.patient4@example.com");
        String stranger = registerCustomerAndLogin("resv.patient5@example.com");
        registerVerifiedPharmacyAndLogin("resv.pharmacy4@example.com", "LIC-V-4");
        UUID inventoryId = createInventoryItem("resv.pharmacy4@example.com", new BigDecimal("15.00"), 5);

        String reservationId = createReservation(owner, inventoryId, 1);

        mockMvc.perform(patch("/api/reservations/" + reservationId + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + stranger))
                .andExpect(status().isForbidden());
    }

    @Test
    void complete_byOwningPharmacy_marksCompleted() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.patient6@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.pharmacy5@example.com", "LIC-V-5");
        UUID inventoryId = createInventoryItem("resv.pharmacy5@example.com", new BigDecimal("70.00"), 5);

        String reservationId = createReservation(patientToken, inventoryId, 1);

        mockMvc.perform(patch("/api/reservations/" + reservationId + "/complete")
                        .header("Authorization", "Bearer " + pharmacyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    void pharmacyReservations_returnsIncomingReservations() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.patient7@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.pharmacy6@example.com", "LIC-V-6");
        UUID inventoryId = createInventoryItem("resv.pharmacy6@example.com", new BigDecimal("25.00"), 5);

        createReservation(patientToken, inventoryId, 1);

        mockMvc.perform(get("/api/reservations").header("Authorization", "Bearer " + pharmacyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    private String createReservation(String patientToken, UUID inventoryId, int quantity) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + patientToken)
                        .content("""
                            { "inventoryItemId": "%s", "quantity": %d }
                            """.formatted(inventoryId, quantity)))
                .andExpect(status().isCreated())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private UUID createInventoryItem(String pharmacyEmail, BigDecimal unitPrice, int stockQuantity) {
        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
                .filter(p -> p.getUser().getEmail().equals(pharmacyEmail))
                .findFirst()
                .orElseThrow();

        Manufacturer manufacturer = manufacturerRepository.save(Manufacturer.builder()
                .name("Acme-" + UUID.randomUUID())
                .country("Sri Lanka")
                .isActive(true)
                .build());

        Category category = categoryRepository.save(Category.builder()
                .name("Category-" + UUID.randomUUID())
                .active(true)
                .build());

        MedicineMaster medicine = medicineMasterRepository.save(MedicineMaster.builder()
                .brandName("Panadol")
                .genericName("Paracetamol")
                .dosageForm("Tablet")
                .strength("500mg")
                .unitOfMeasure(UnitOfMeasure.TABLET)
                .manufacturer(manufacturer)
                .therapeuticCategory(category)
                .legalCategory(PrescriptionStatus.OTC)
                .build());

        Inventory inventory = inventoryRepository.save(Inventory.builder()
                .medicineMaster(medicine)
                .pharmacy(pharmacy)
                .unitPrice(unitPrice)
                .currency(Currency.LKR)
                .stockQuantity(stockQuantity)
                .expireDate(LocalDate.now().plusYears(1))
                .available(true)
                .build());

        return inventory.getId();
    }

    private String registerCustomerAndLogin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "name": "Test Customer", "email": "%s", "phone": "0771234567", "password": "SecurePass123" }
                            """.formatted(email)))
                .andExpect(status().isCreated());

        return loginAndGetToken(email);
    }

    private String registerVerifiedPharmacyAndLogin(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "name": "Test Pharmacy", "email": "%s", "phone": "0112345678", "password": "SecurePass123", "licenceNo": "%s", "address": "123 Test Rd" }
                            """.formatted(email, licenceNo)))
                .andExpect(status().isCreated());

        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
                .filter(p -> p.getUser().getEmail().equals(email))
                .findFirst()
                .orElseThrow();
        pharmacy.setStatus(PharmacyStatus.VERIFIED);
        pharmacyRepository.save(pharmacy);

        return loginAndGetToken(email);
    }

    private String loginAndGetToken(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "email": "%s", "password": "SecurePass123" }
                            """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.token");
    }
}
