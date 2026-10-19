package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.UserRepository;
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
 * the dashboard used to be hardcoded to all-zeros, and deleting a user with dependent rows used
 * to throw an unhandled 500 instead of a clean 409.
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
        userRepository.save(User.builder()
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
    void deleteUser_withNoDependentRows_succeeds() throws Exception {
        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = "admin.delete.clean@example.com";
        registerCustomer(email);
        UUID userId = findUserId(email);

        mockMvc.perform(delete("/api/admin/users/" + userId).header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());
    }

    // Note: deleting a user with dependent rows (a Pharmacy, PrescriptionRequest, etc.) returning
    // 409 instead of 500 depends on the real MySQL foreign key constraints defined in the
    // Liquibase migrations. The H2 test database (Hibernate's own schema generation, Liquibase
    // disabled per application-test.properties) doesn't reproduce that constraint reliably, so
    // this is covered by a focused unit test on GlobalExceptionHandler instead - see
    // GlobalExceptionHandlerTest.handleDataIntegrityViolation_returnsConflict - plus it was
    // manually verified against real MySQL during this bug-fix pass (DELETE on a pharmacy-owning
    // user correctly returned 409).

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
                    { "name": "Admin Test Customer", "email": "%s", "phone": "0771234567", "password": "SecurePass123" }
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
