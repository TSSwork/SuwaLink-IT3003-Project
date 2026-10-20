package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Category;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.PharmacyVisibilityService;
import com.suwalink.support.TestPayloads;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MedicineSuggestionTest {

    private static final String ADMIN_EMAIL = "admin.suggest@suwalink.local";
    private static final String ADMIN_PASSWORD = "AdminPass123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private PharmacyVisibilityService visibility;

    private String adminToken;
    private String ownerToken;
    private UUID categoryId;
    private UUID manufacturerId;

    @BeforeEach
    void setUp() throws Exception {
        visibility.setDemoModePublic(false);
        userRepository.save(User.builder().termsAcceptedAt(java.time.LocalDateTime.now())
                .name("Suggest Admin").email(ADMIN_EMAIL).phone("0000000000")
                .password(passwordEncoder.encode(ADMIN_PASSWORD)).role(Role.ADMIN).build());
        adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        categoryId = categoryRepository.save(Category.builder().name("Cat-" + UUID.randomUUID()).active(true).build()).getId();
        manufacturerId = manufacturerRepository.save(Manufacturer.builder()
                .name("Acme-" + UUID.randomUUID()).country("Sri Lanka").isActive(true).build()).getId();
        ownerToken = registerAndApprovePharmacy("suggest.owner@example.com", "LIC-SUGGEST-1");
    }

    @Test
    void ownerSuggestsMedicine() throws Exception {
        String id = suggest("Zentel", "Albendazole", "400mg", "Tablet");

        mockMvc.perform(get("/api/medicines/suggestions/mine").header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(id))
                .andExpect(jsonPath("$.data[0].status").value("PENDING"));
        mockMvc.perform(get("/api/medicines").header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + id + "')]").isEmpty());
        mockMvc.perform(post("/api/inventory").header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(inventoryJson(id)))
                .andExpect(status().isNotFound());
    }

    @Test
    void duplicateSuggestionIs409() throws Exception {
        suggest("Zentel", "Albendazole", "400mg", "Tablet");
        mockMvc.perform(post("/api/medicines/suggestions").header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(suggestionJson("zentel", "Albendazole", "400MG", "tablet")))
                .andExpect(status().isConflict());
    }

    @Test
    void adminApprovesSuggestion() throws Exception {
        String id = suggest("Zentel", "Albendazole", "400mg", "Tablet");

        mockMvc.perform(get("/api/admin/medicines/suggestions").param("status", "PENDING")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(id));
        mockMvc.perform(put("/api/admin/medicines/suggestions/" + id + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));

        mockMvc.perform(get("/api/notifications").header("Authorization", "Bearer " + ownerToken))
                .andExpect(jsonPath("$.data[0].message").value(org.hamcrest.Matchers.containsString("Zentel")))
                .andExpect(jsonPath("$.data[0].title").value("Medicine suggestion approved"));
        mockMvc.perform(get("/api/medicines").header("Authorization", "Bearer " + ownerToken))
                .andExpect(jsonPath("$.data[?(@.id == '" + id + "')]").isNotEmpty());
        mockMvc.perform(post("/api/inventory").header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(inventoryJson(id)))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/medicines/search").param("q", "zentel"))
                .andExpect(jsonPath("$.data.content.length()").value(1));
    }

    @Test
    void adminRejectsWithReason() throws Exception {
        String id = suggest("Zentel", "Albendazole", "400mg", "Tablet");

        mockMvc.perform(put("/api/admin/medicines/suggestions/" + id + "/reject")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Already listed under another name\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectionReason").value("Already listed under another name"));

        mockMvc.perform(get("/api/notifications").header("Authorization", "Bearer " + ownerToken))
                .andExpect(jsonPath("$.data[0].title").value("Medicine suggestion not approved"))
                .andExpect(jsonPath("$.data[0].message").value(
                        org.hamcrest.Matchers.containsString("Reason: Already listed under another name")));
        mockMvc.perform(post("/api/inventory").header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(inventoryJson(id)))
                .andExpect(status().isNotFound());
    }

    @Test
    void reviewingTwiceIs409AlreadyReviewed() throws Exception {
        String id = suggest("Zentel", "Albendazole", "400mg", "Tablet");
        mockMvc.perform(put("/api/admin/medicines/suggestions/" + id + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/medicines/suggestions/" + id + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_REVIEWED"));
        mockMvc.perform(put("/api/admin/medicines/suggestions/" + id + "/reject")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Too late\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_REVIEWED"));
    }

    @Test
    void customerCannotSuggest() throws Exception {
        mockMvc.perform(post("/api/auth/register/customer").contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.customerRegistration("suggest.cust@example.com"))).andExpect(status().isCreated());
        String token = login("suggest.cust@example.com", "SecurePass123");
        mockMvc.perform(post("/api/medicines/suggestions").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(suggestionJson("Zentel", "Albendazole", "400mg", "Tablet")))
                .andExpect(status().isForbidden());
    }

    private String suggest(String brand, String generic, String strength, String form) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/medicines/suggestions")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(suggestionJson(brand, generic, strength, form)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private String suggestionJson(String brand, String generic, String strength, String form) {
        return """
            { "brandName": "%s", "genericName": "%s", "dosageForm": "%s", "strength": "%s",
              "unitOfMeasure": "TABLET", "therapeuticCategoryId": "%s", "manufacturerId": "%s",
              "legalCategory": "OTC" }
            """.formatted(brand, generic, form, strength, categoryId, manufacturerId);
    }

    private String inventoryJson(String medicineId) {
        return """
            { "medicineMasterId": "%s", "unitPrice": 10.00, "stockQuantity": 5, "expireDate": "%s" }
            """.formatted(medicineId, LocalDate.now().plusYears(1));
    }

    private String registerAndApprovePharmacy(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy").contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration(email, licenceNo))).andExpect(status().isCreated());
        UUID pharmacyId = pharmacyRepository.findAll().stream()
                .filter(p -> p.getUser().getEmail().equals(email)).findFirst().map(Pharmacy::getId).orElseThrow();
        mockMvc.perform(put("/api/admin/pharmacies/" + pharmacyId + "/approve")
                .header("Authorization", "Bearer " + adminToken)).andExpect(status().isOk());
        return login(email, "SecurePass123");
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{ \"email\": \"%s\", \"password\": \"%s\" }".formatted(email, password)))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.token");
    }
}
