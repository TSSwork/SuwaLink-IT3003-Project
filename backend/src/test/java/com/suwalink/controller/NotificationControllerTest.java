package com.suwalink.controller;

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

/**
 * Covers the ownership fix on markAsRead - it used to silently no-op (still returning 200) when
 * a notification belonged to someone else, instead of reporting an error. Uses pharmacy
 * approval (which publishes a real PharmacyVerifiedEvent) as a deterministic way to generate a
 * real notification without mocking the event system.
 *
 * <p>Creates its own admin user directly - the bootstrap admin (004-admin-role.sql) only exists
 * via Liquibase, which is disabled in the H2 test profile.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificationControllerTest {

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
    void markAsRead_ownNotification_succeeds() throws Exception {
        String pharmacyToken = registerAndApprovePharmacy("notif.owner@example.com", "LIC-NOTIF-1");
        String notificationId = firstNotificationId(pharmacyToken);

        mockMvc.perform(put("/api/notifications/" + notificationId + "/read")
                .header("Authorization", "Bearer " + pharmacyToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void markAsRead_someoneElsesNotification_returnsNotFound() throws Exception {
        String pharmacyToken = registerAndApprovePharmacy("notif.victim@example.com", "LIC-NOTIF-2");
        String notificationId = firstNotificationId(pharmacyToken);

        String strangerToken = registerCustomerAndLogin("notif.stranger@example.com");

        mockMvc.perform(put("/api/notifications/" + notificationId + "/read")
                .header("Authorization", "Bearer " + strangerToken))
            .andExpect(status().isNotFound());
    }

    @Test
    void unreadCount_reflectsNewNotification() throws Exception {
        String pharmacyToken = registerAndApprovePharmacy("notif.count@example.com", "LIC-NOTIF-3");

        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", "Bearer " + pharmacyToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.count").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
    }

    private String firstNotificationId(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/notifications").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data[0].id");
    }

    private String registerAndApprovePharmacy(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "name": "Notif Test Pharmacy", "email": "%s", "phone": "0112345678", "password": "SecurePass123", "licenceNo": "%s", "address": "123 Test Rd" }
                    """.formatted(email, licenceNo)))
            .andExpect(status().isCreated());

        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        UUID pharmacyId = pharmacyRepository.findAll().stream()
            .filter(p -> p.getUser().getEmail().equals(email))
            .findFirst()
            .map(Pharmacy::getId)
            .orElseThrow();

        mockMvc.perform(put("/api/admin/pharmacies/" + pharmacyId + "/approve")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());

        return loginAndGetToken(email, "SecurePass123");
    }

    private String registerCustomerAndLogin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "name": "Notif Test Customer", "email": "%s", "phone": "0771234567", "password": "SecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isCreated());

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
