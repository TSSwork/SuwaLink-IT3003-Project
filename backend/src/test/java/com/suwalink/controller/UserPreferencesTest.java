package com.suwalink.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.support.TestPayloads;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Locale;
import java.util.Properties;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.MessageSource;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserPreferencesTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MessageSource messageSource;

    @Test
    void userSetsPreferredLanguageAndDistrict() throws Exception {
        String token = registerAndLogin("prefs.ok@example.com");

        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.data.preferredLanguage").value("en"))
            .andExpect(jsonPath("$.data.district").doesNotExist());

        mockMvc.perform(put("/api/users/me/preferences")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"preferredLanguage\":\"si\",\"district\":\"KANDY\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.preferredLanguage").value("si"))
            .andExpect(jsonPath("$.data.district").value("KANDY"));
    }

    @Test
    void unknownLanguageIs400() throws Exception {
        String token = registerAndLogin("prefs.bad@example.com");

        mockMvc.perform(put("/api/users/me/preferences")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"preferredLanguage\":\"fr\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }

    @Test
    void missingLanguageIs400ValidationFailed() throws Exception {
        String token = registerAndLogin("prefs.missing@example.com");

        mockMvc.perform(put("/api/users/me/preferences")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"district\":\"KANDY\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.errors[?(@.field=='preferredLanguage')].code").value("NotNull"));
    }

    @Test
    void validationErrorsCarryCodes() throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"X\",\"email\":\"\",\"phone\":\"0771234567\",\"password\":\"SecurePass123\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.errors[?(@.field=='email')].code").value(org.hamcrest.Matchers.hasItem("NotBlank")));
    }

    @Test
    void unauthenticatedRequestCarriesCode() throws Exception {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void urlRuleDenialCarriesAccessDeniedCode() throws Exception {
        String token = registerAndLogin("prefs.denied@example.com");

        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
            .andExpect(jsonPath("$.message").value("You do not have permission to perform this action"));
    }

    @Test
    void notFoundCarriesCode() throws Exception {
        String token = registerAndLogin("prefs.nf@example.com");

        mockMvc.perform(get("/api/medicines/" + UUID.randomUUID()).header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void acceptLanguageHeaderSelectsLocale() throws Exception {
        // Locale resolution is observable through the LocaleResolver bean via a request.
        MvcResult result = mockMvc.perform(get("/api/settings/public").header("Accept-Language", "ta"))
            .andReturn();
        assertEquals(Locale.forLanguageTag("ta"),
            org.springframework.web.servlet.support.RequestContextUtils.getLocale(result.getRequest()));
    }

    @Test
    void messageSourceResolvesAllThreeLanguages() throws Exception {
        String en = messageSource.getMessage("error.not_found", null, Locale.ENGLISH);
        String si = messageSource.getMessage("error.not_found", null, Locale.forLanguageTag("si"));
        String ta = messageSource.getMessage("error.not_found", null, Locale.forLanguageTag("ta"));
        assertNotEquals(en, si);
        assertNotEquals(en, ta);
        assertNotEquals(si, ta);

        Set<String> enKeys = keys("messages.properties");
        assertFalse(enKeys.isEmpty());
        assertTrue(keys("messages_si.properties").containsAll(enKeys), "si is missing keys");
        assertTrue(keys("messages_ta.properties").containsAll(enKeys), "ta is missing keys");
        assertEquals(enKeys, keys("messages_si.properties"));
        assertEquals(enKeys, keys("messages_ta.properties"));
    }

    private Set<String> keys(String file) throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/i18n/" + file)) {
            Properties props = new Properties();
            props.load(new java.io.InputStreamReader(in, java.nio.charset.StandardCharsets.UTF_8));
            return new HashSet<>(props.stringPropertyNames());
        }
    }

    private String registerAndLogin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.customerRegistration(email)))
            .andExpect(status().isCreated());
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"SecurePass123\"}".formatted(email)))
            .andExpect(status().isOk())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.token");
    }
}
