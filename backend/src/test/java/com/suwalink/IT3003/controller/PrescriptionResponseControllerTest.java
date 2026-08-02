package com.suwalink.IT3003.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.IT3003.entity.Category;
import com.suwalink.IT3003.entity.Currency;
import com.suwalink.IT3003.entity.Inventory;
import com.suwalink.IT3003.entity.Manufacturer;
import com.suwalink.IT3003.entity.MedicineMaster;
import com.suwalink.IT3003.entity.Pharmacy;
import com.suwalink.IT3003.entity.PrescriptionStatus;
import com.suwalink.IT3003.entity.UnitOfMeasure;
import com.suwalink.IT3003.repository.CategoryRepository;
import com.suwalink.IT3003.repository.InventoryRepository;
import com.suwalink.IT3003.repository.ManufacturerRepository;
import com.suwalink.IT3003.repository.MedicineMasterRepository;
import com.suwalink.IT3003.repository.PharmacyRepository;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PrescriptionResponseControllerTest {

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
    void create_asPharmacy_returnsCreatedResponseAndFlipsRequestStatus() throws Exception {
        String patientToken = registerCustomerAndLogin("presp.patient1@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("presp.pharmacy1@example.com", "LIC-R-1");

        String requestId = createPrescription(patientToken, 30, "Need painkillers");
        UUID inventoryId = createInventoryItem("presp.pharmacy1@example.com", new BigDecimal("150.00"), 20);

        mockMvc.perform(post("/api/prescriptions/" + requestId + "/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + pharmacyToken)
                        .content("""
                            { "message": "We have it in stock", "items": [ { "inventoryItemId": "%s", "quantity": 2 } ] }
                            """.formatted(inventoryId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.message").value("We have it in stock"))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].quantity").value(2))
                .andExpect(jsonPath("$.data.items[0].unitPrice").value(150.00));

        mockMvc.perform(get("/api/prescriptions/" + requestId).header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESPONDED"));
    }

    @Test
    void create_withItemNotOwnedByPharmacy_isForbidden() throws Exception {
        String patientToken = registerCustomerAndLogin("presp.patient2@example.com");
        registerVerifiedPharmacyAndLogin("presp.pharmacyA@example.com", "LIC-R-2");
        String pharmacyBToken = registerVerifiedPharmacyAndLogin("presp.pharmacyB@example.com", "LIC-R-3");

        String requestId = createPrescription(patientToken, 40, "Need antibiotics");
        UUID inventoryOwnedByA = createInventoryItem("presp.pharmacyA@example.com", new BigDecimal("80.00"), 5);

        mockMvc.perform(post("/api/prescriptions/" + requestId + "/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + pharmacyBToken)
                        .content("""
                            { "items": [ { "inventoryItemId": "%s", "quantity": 1 } ] }
                            """.formatted(inventoryOwnedByA)))
                .andExpect(status().isForbidden());
    }

    @Test
    void create_onClosedRequest_isBadRequest() throws Exception {
        String patientToken = registerCustomerAndLogin("presp.patient3@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("presp.pharmacy3@example.com", "LIC-R-4");

        String requestId = createPrescription(patientToken, 50, "Need vitamins");
        UUID inventoryId = createInventoryItem("presp.pharmacy3@example.com", new BigDecimal("60.00"), 10);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .patch("/api/prescriptions/" + requestId + "/close")
                        .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/prescriptions/" + requestId + "/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + pharmacyToken)
                        .content("""
                            { "items": [ { "inventoryItemId": "%s", "quantity": 1 } ] }
                            """.formatted(inventoryId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listForRequest_asRespondingPharmacy_returnsOnlyOwnResponse() throws Exception {
        String patientToken = registerCustomerAndLogin("presp.patient4@example.com");
        String pharmacyAToken = registerVerifiedPharmacyAndLogin("presp.pharmacyC@example.com", "LIC-R-5");
        String pharmacyBToken = registerVerifiedPharmacyAndLogin("presp.pharmacyD@example.com", "LIC-R-6");

        String requestId = createPrescription(patientToken, 22, "Need syrup");
        UUID inventoryA = createInventoryItem("presp.pharmacyC@example.com", new BigDecimal("30.00"), 15);
        UUID inventoryB = createInventoryItem("presp.pharmacyD@example.com", new BigDecimal("35.00"), 15);

        submitResponse(pharmacyAToken, requestId, inventoryA, 1);
        submitResponse(pharmacyBToken, requestId, inventoryB, 1);

        mockMvc.perform(get("/api/prescriptions/" + requestId + "/responses")
                        .header("Authorization", "Bearer " + pharmacyAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].items[0].unitPrice").value(30.00));
    }

    @Test
    void listMyResponses_asPharmacy_returnsSubmittedResponses() throws Exception {
        String patientToken = registerCustomerAndLogin("presp.patient5@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("presp.pharmacy5@example.com", "LIC-R-7");

        String requestId = createPrescription(patientToken, 33, "Need cream");
        UUID inventoryId = createInventoryItem("presp.pharmacy5@example.com", new BigDecimal("45.00"), 8);
        submitResponse(pharmacyToken, requestId, inventoryId, 1);

        mockMvc.perform(get("/api/prescriptions/responses/me").header("Authorization", "Bearer " + pharmacyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    private void submitResponse(String pharmacyToken, String requestId, UUID inventoryId, int quantity)
            throws Exception {
        mockMvc.perform(post("/api/prescriptions/" + requestId + "/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + pharmacyToken)
                        .content("""
                            { "items": [ { "inventoryItemId": "%s", "quantity": %d } ] }
                            """.formatted(inventoryId, quantity)))
                .andExpect(status().isCreated());
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

    private MockMultipartFile samplePrescriptionImage() throws IOException {
        BufferedImage image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return new MockMultipartFile("image", "prescription.png", MediaType.IMAGE_PNG_VALUE, out.toByteArray());
    }

    private String createPrescription(String token, int age, String note) throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/prescriptions")
                        .file(samplePrescriptionImage())
                        .param("patientAge", String.valueOf(age))
                        .param("note", note)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
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
        pharmacy.setVerified(true);
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
