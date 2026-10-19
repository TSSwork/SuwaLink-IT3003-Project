package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.support.TestPayloads;
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
class UserControllerMeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Test
    void me_withValidCustomerToken_returnsProfileWithoutPharmacy() throws Exception {
        registerCustomer("me.customer@example.com");
        String token = loginAndGetToken("me.customer@example.com");

        mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.email").value("me.customer@example.com"))
            .andExpect(jsonPath("$.data.role").value("CUSTOMER"))
            .andExpect(jsonPath("$.data.pharmacy").doesNotExist());
    }

    @Test
    void me_withValidVerifiedPharmacyToken_returnsProfileWithPharmacyInfo() throws Exception {
        registerPharmacy("me.pharmacy@example.com", "LIC-ME-1");
        verifyPharmacy("me.pharmacy@example.com");
        String token = loginAndGetToken("me.pharmacy@example.com");

        mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.role").value("PHARMACY_OWNER"))
            .andExpect(jsonPath("$.data.pharmacy.licenceNo").value("LIC-ME-1"))
            .andExpect(jsonPath("$.data.pharmacy.status").value("VERIFIED"));
    }

    @Test
    void me_withoutToken_isRejected() throws Exception {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().is4xxClientError());
    }

    private void registerCustomer(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "name": "Test Customer", "email": "%s", "phone": "0771234567", "password": "SecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isCreated());
    }

    private void registerPharmacy(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
            .andExpect(status().isCreated());
    }

    private void verifyPharmacy(String email) {
        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
            .filter(p -> p.getUser().getEmail().equals(email))
            .findFirst()
            .orElseThrow();
        pharmacy.setStatus(PharmacyStatus.VERIFIED);
        pharmacyRepository.save(pharmacy);
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
