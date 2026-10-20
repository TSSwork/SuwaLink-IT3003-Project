package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.NotificationType;
import com.suwalink.event.NotificationKeys;
import com.suwalink.service.NotificationService;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Properties;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.UserRepository;
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
 * Lists render each keyed notification in the request language; also covers the ownership fix on markAsRead - it used to silently no-op (still returning 200) when
 * a notification belonged to someone else, instead of reporting an error. Uses pharmacy
 * approval (which publishes a real PharmacyVerifiedEvent) as a deterministic way to generate a
 * real notification without mocking the event system.
 *
 * <p>Creates its own admin user directly rather than relying on the account that
 * {@code AdminBootstrap} creates at startup.
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

    @Autowired
    private NotificationService notificationService;

    private static final Map<String, String> PARAMS =
        Map.of("items", "Panadol 500mg × 2", "pharmacy", "City Pharmacy", "code", "ABCD2345");

    @Test
    void listRendersInRequestLanguage() throws Exception {
        String token = registerCustomerAndLogin("notif.si@example.com");
        notifyCustomer("notif.si@example.com");

        mockMvc.perform(get("/api/notifications")
                .header("Authorization", "Bearer " + token)
                .header("Accept-Language", "si"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].title").value(expected("messages_si", "notify.reservation.confirmed.title")))
            .andExpect(jsonPath("$.data[0].message").value(expected("messages_si", "notify.reservation.confirmed.body")))
            .andExpect(jsonPath("$.data[0].message").value(org.hamcrest.Matchers.containsString("City Pharmacy")))
            .andExpect(jsonPath("$.data[0].link").value("/reservations/abc"))
            .andExpect(jsonPath("$.data[0].type").value("RESERVATION"))
            .andExpect(jsonPath("$.data[0].read").value(false));
    }

    @Test
    void listDefaultsToEnglish() throws Exception {
        String token = registerCustomerAndLogin("notif.en@example.com");
        notifyCustomer("notif.en@example.com");

        mockMvc.perform(get("/api/notifications").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].title").value(expected("messages", "notify.reservation.confirmed.title")))
            .andExpect(jsonPath("$.data[0].message").value(expected("messages", "notify.reservation.confirmed.body")));

        mockMvc.perform(get("/api/notifications")
                .header("Authorization", "Bearer " + token)
                .header("Accept-Language", "fr"))
            .andExpect(jsonPath("$.data[0].title").value(expected("messages", "notify.reservation.confirmed.title")));
    }

    @Test
    void markAllRead() throws Exception {
        String token = registerCustomerAndLogin("notif.all@example.com");
        notifyCustomer("notif.all@example.com");
        notifyCustomer("notif.all@example.com");

        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.data.count").value(2));

        mockMvc.perform(put("/api/notifications/read-all").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.data.count").value(0));
    }

    @Test
    void pharmacyRegistrationNotifiesAdmins() throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration("notif.newpharm@example.com", "LIC-NOTIF-REG")))
            .andExpect(status().isCreated());

        String adminToken = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        mockMvc.perform(get("/api/notifications").header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].title").value(expected("messages", "notify.pharmacy.registered.title")))
            .andExpect(jsonPath("$.data[0].link").value("/admin/pharmacies"));
    }

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

    private void notifyCustomer(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        notificationService.notify(user, NotificationType.RESERVATION, NotificationKeys.RESERVATION_CONFIRMED,
            PARAMS, "/reservations/abc");
    }

    /** Bundle text with params substituted, read straight from the properties file. */
    private static String expected(String bundle, String key) throws Exception {
        Properties properties = new Properties();
        try (var in = NotificationControllerTest.class.getResourceAsStream("/i18n/" + bundle + ".properties")) {
            properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        String text = properties.getProperty(key);
        for (Map.Entry<String, String> param : PARAMS.entrySet()) {
            text = text.replace("{" + param.getKey() + "}", param.getValue());
        }
        return text;
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
                .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
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
                    { "name": "Notif Test Customer", "email": "%s", "phone": "0771234567", "password": "SecurePass123", "acceptTerms": true }
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
