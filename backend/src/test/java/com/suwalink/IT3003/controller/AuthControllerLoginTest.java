package com.suwalink.IT3003.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.suwalink.IT3003.entity.Pharmacy;
import com.suwalink.IT3003.entity.PharmacyStatus;
import com.suwalink.IT3003.repository.PharmacyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerLoginTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Test
    void login_withValidCustomerCredentials_returnsTokenAndRole() throws Exception {
        registerCustomer("login.customer@example.com");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "login.customer@example.com", "password": "SecurePass123" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.token").isNotEmpty())
            .andExpect(jsonPath("$.data.role").value("CUSTOMER"));
    }

    @Test
    void login_withVerifiedPharmacy_returnsToken() throws Exception {
        registerPharmacy("login.pharmacy@example.com", "LIC-LOGIN-1");
        verifyPharmacy("login.pharmacy@example.com");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "login.pharmacy@example.com", "password": "SecurePass123" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.token").isNotEmpty())
            .andExpect(jsonPath("$.data.role").value("PHARMACY_ADMIN"));
    }

    @Test
    void login_withUnverifiedPharmacy_returnsForbidden() throws Exception {
        registerPharmacy("unverified.pharmacy@example.com", "LIC-LOGIN-2");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "unverified.pharmacy@example.com", "password": "SecurePass123" }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void login_withWrongPassword_returnsUnauthorized() throws Exception {
        registerCustomer("wrongpass.customer@example.com");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "wrongpass.customer@example.com", "password": "WrongPassword1" }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false));
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
                .content("""
                    { "name": "Test Pharmacy", "email": "%s", "phone": "0112345678", "password": "SecurePass123", "licenceNo": "%s", "address": "123 Test Rd" }
                    """.formatted(email, licenceNo)))
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
}
