package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.PharmacyVisibilityService;
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
class DemoModeTest {

    private static final String PASSWORD = "SecurePass123";
    private static final String ADMIN_EMAIL = "demo.admin@suwalink.local";
    private static final String DEMO_EMAIL = "demo.customer@suwalink.local";
    private static final String CUSTOMER_EMAIL = "plain.customer@suwalink.local";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private PharmacyVisibilityService visibility;

    @BeforeEach
    void setUp() {
        visibility.setDemoModePublic(false);
        save(ADMIN_EMAIL, Role.ADMIN, false);
        save(DEMO_EMAIL, Role.CUSTOMER, true);
        save(CUSTOMER_EMAIL, Role.CUSTOMER, false);
    }

    private void save(String email, Role role, boolean demo) {
        userRepository.save(User.builder().termsAcceptedAt(java.time.LocalDateTime.now())
            .name("Test").email(email).phone("0771234567")
            .password(passwordEncoder.encode(PASSWORD)).role(role).demo(demo).build());
    }

    private MvcResult login(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD)))
            .andReturn();
    }

    private String token(String email) throws Exception {
        MvcResult result = login(email);
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.token");
    }

    private void setMode(String adminToken, boolean value) throws Exception {
        mockMvc.perform(put("/api/admin/settings").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"demoModePublic\":%s}".formatted(value)))
            .andExpect(status().isOk());
    }

    @Test
    void adminTogglesDemoMode() throws Exception {
        String admin = token(ADMIN_EMAIL);
        setMode(admin, true);
        mockMvc.perform(get("/api/settings/public"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.demoModePublic").value(true));
        mockMvc.perform(get("/api/admin/settings").header("Authorization", "Bearer " + admin))
            .andExpect(jsonPath("$.data.demoModePublic").value(true));
    }

    @Test
    void nonAdminCannotChangeSettings() throws Exception {
        mockMvc.perform(put("/api/admin/settings")
                .header("Authorization", "Bearer " + token(CUSTOMER_EMAIL))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"demoModePublic\":true}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void demoUserCannotLoginWhenDemoModeOff() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(DEMO_EMAIL, PASSWORD)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Demo accounts are currently disabled"));
    }

    @Test
    void demoUserCanLoginWhenDemoModeOn() throws Exception {
        visibility.setDemoModePublic(true);
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(DEMO_EMAIL, PASSWORD)))
            .andExpect(status().isOk());
    }

    @Test
    void demoUserTokenStopsWorkingWhenSwitchedOff() throws Exception {
        String admin = token(ADMIN_EMAIL);
        setMode(admin, true);
        String demoToken = token(DEMO_EMAIL);
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + demoToken))
            .andExpect(status().isOk());
        setMode(admin, false);
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + demoToken))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void publicSettingsListDemoAccountsOnlyWhenOn() throws Exception {
        mockMvc.perform(get("/api/settings/public"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.demoAccounts").isEmpty());

        visibility.setDemoModePublic(true);
        mockMvc.perform(get("/api/settings/public"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.demoAccounts.length()").value(2))
            .andExpect(jsonPath("$.data.demoAccounts[0].role").value("CUSTOMER"))
            .andExpect(jsonPath("$.data.demoAccounts[0].email").value("customer1@demo.suwalink.lk"))
            .andExpect(jsonPath("$.data.demoAccounts[0].password").value("DemoPass123!"))
            .andExpect(jsonPath("$.data.demoAccounts[1].role").value("PHARMACY_OWNER"))
            .andExpect(jsonPath("$.data.demoAccounts[1].email").value("pharmacy1@demo.suwalink.lk"))
            .andExpect(jsonPath("$.data.demoAccounts[1].password").value("DemoPass123!"));
    }

    @Test
    void nonAdminCannotResetDemoData() throws Exception {
        mockMvc.perform(post("/api/admin/demo/reset")
                .header("Authorization", "Bearer " + token(CUSTOMER_EMAIL)))
            .andExpect(status().isForbidden());
    }
}
