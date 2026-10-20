package com.suwalink.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.UserRepository;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.springframework.mock.web.MockMultipartFile;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.suwalink.support.TestPayloads;
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

/**
 * Covers the admin module - previously untested. Exercises the real bugs found and fixed here:
 * the dashboard used to be hardcoded to all-zeros. User deletion anonymises the account (see
 * {@link AccountLifecycleTest} for the full rules).
 *
 * <p>Each test creates its own admin user directly rather than relying on the account that
 * {@code AdminBootstrap} creates from {@code app.admin.*} at startup.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminControllerTest {

    private static final String ADMIN_EMAIL = "admin.test@suwalink.local";
    private static final String ADMIN_PASSWORD = "AdminPass123!";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void createAdminUser() {
        if (userRepository.findByEmail(ADMIN_EMAIL).isPresent()) return;
        userRepository.save(User.builder().termsAcceptedAt(java.time.LocalDateTime.now())
            .name("Test Admin")
            .email(ADMIN_EMAIL)
            .phone("0000000000")
            .password(passwordEncoder.encode(ADMIN_PASSWORD))
            .role(Role.ADMIN)
            .build());
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Test
    void adminPharmacyListIncludesLocation() throws Exception {
        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        registerPharmacy("admin.loc.pharmacy@example.com", "LIC-LOC-1");

        mockMvc.perform(get("/api/admin/pharmacies").header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].district").value("COLOMBO"))
            .andExpect(jsonPath("$.data[0].latitude").exists())
            .andExpect(jsonPath("$.data[0].longitude").exists());
    }

    @Test
    void dashboard_reflectsRealCounts_notHardcodedZeros() throws Exception {
        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        registerPharmacy("admin.dash.pharmacy@example.com", "LIC-DASH-1");

        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalPharmacies").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.data.pendingPharmacies").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
    }

    @Test
    void approvePharmacy_setsVerifiedStatus_andAllowsLogin() throws Exception {
        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = "admin.approve.pharmacy@example.com";
        registerPharmacy(email, "LIC-APPROVE-1");
        UUID pharmacyId = findPharmacyId(email);

        mockMvc.perform(put("/api/admin/pharmacies/" + pharmacyId + "/approve")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s", "password": "SecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void rejectPharmacy_setsRejectedStatus_andBlocksLoginWithDistinctMessage() throws Exception {
        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = "admin.reject.pharmacy@example.com";
        registerPharmacy(email, "LIC-REJECT-1");
        UUID pharmacyId = findPharmacyId(email);

        mockMvc.perform(put("/api/admin/pharmacies/" + pharmacyId + "/reject")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s", "password": "SecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Your pharmacy application was rejected"));
    }

    @Test
    void deleteUser_anonymisesCustomer() throws Exception {
        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = "admin.delete.clean@example.com";
        registerCustomer(email);
        UUID userId = findUserId(email);

        mockMvc.perform(delete("/api/admin/users/" + userId).header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());

        User deleted = userRepository.findById(userId).orElseThrow();
        assertThat(deleted.getEmail()).isEqualTo("deleted-" + userId + "@deleted.suwalink.invalid");
        assertThat(deleted.getDeletedAt()).isNotNull();
        mockMvc.perform(delete("/api/admin/users/" + userId).header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNotFound());
    }

    @Test
    void deletePharmacyOwner_targetedByPrescriptionRequest_deactivatesPharmacyAndKeepsRequest() throws Exception {
        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        String pharmacyEmail = "admin.delete.targeted@example.com";
        registerPharmacy(pharmacyEmail, "LIC-DEL-T1");
        mockMvc.perform(put("/api/admin/pharmacies/" + findPharmacyId(pharmacyEmail) + "/approve")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());
        String customerToken = registerCustomerAndLogin("admin.delete.targeted.customer@example.com");

        BufferedImage image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        MvcResult created = mockMvc.perform(multipart("/api/prescriptions")
                .file(new MockMultipartFile("image", "p.png", MediaType.IMAGE_PNG_VALUE, out.toByteArray()))
                .with(TestPayloads.prescriptionTargetAll())
                .param("patientAge", "30")
                .header("Authorization", "Bearer " + customerToken))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.targetCount").value(1))
            .andReturn();
        String requestId = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        UUID pharmacyId = findPharmacyId(pharmacyEmail);
        mockMvc.perform(delete("/api/admin/users/" + findUserId(pharmacyEmail))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());

        // Deletion anonymises the owner and deactivates the pharmacy; nothing is hard-deleted.
        assertThat(pharmacyRepository.findById(pharmacyId).orElseThrow().getStatus())
            .isEqualTo(PharmacyStatus.DEACTIVATED);
        mockMvc.perform(get("/api/prescriptions/" + requestId).header("Authorization", "Bearer " + customerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.targetCount").value(1));
    }

    @Test
    void adminEndpoints_asNonAdmin_areForbidden() throws Exception {
        String customerToken = registerCustomerAndLogin("admin.notallowed@example.com");

        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", "Bearer " + customerToken))
            .andExpect(status().isForbidden());
    }

    private UUID findPharmacyId(String email) {
        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
            .filter(p -> p.getUser().getEmail().equals(email))
            .findFirst()
            .orElseThrow();
        return pharmacy.getId();
    }

    private UUID findUserId(String email) throws Exception {
        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        MvcResult result = mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        String json = result.getResponse().getContentAsString();
        List<Map<String, Object>> users = JsonPath.read(json, "$.data");
        String id = users.stream()
            .filter(u -> email.equals(u.get("email")))
            .map(u -> (String) u.get("id"))
            .findFirst()
            .orElseThrow();
        return UUID.fromString(id);
    }

    private void registerCustomer(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "name": "Admin Test Customer", "email": "%s", "phone": "0771234567", "password": "SecurePass123", "acceptTerms": true }
                    """.formatted(email)))
            .andExpect(status().isCreated());
    }

    private void registerPharmacy(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
            .andExpect(status().isCreated());
    }

    private String registerCustomerAndLogin(String email) throws Exception {
        registerCustomer(email);
        return loginAndGetToken(email, "SecurePass123");
    }

    private String loginAndGetToken(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s", "password": "%s" }
                    """.formatted(email, password)))
            .andExpect(status().isOk())
            .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.token");
    }
}
