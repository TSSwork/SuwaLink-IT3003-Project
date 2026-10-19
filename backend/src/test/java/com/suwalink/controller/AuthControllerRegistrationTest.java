package com.suwalink.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerRegistrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void registerCustomer_withValidData_returnsTokenAndAutoLogsIn() throws Exception {
        String requestBody = """
            {
              "name": "Nimal Perera",
              "email": "nimal@example.com",
              "phone": "0771234567",
              "password": "SecurePass123"
            }
            """;

        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.token").isNotEmpty())
            .andExpect(jsonPath("$.data.role").value("CUSTOMER"))
            .andExpect(jsonPath("$.data.name").value("Nimal Perera"));
    }

    @Test
    void registerCustomer_withDuplicateEmail_returnsConflict() throws Exception {
        String requestBody = """
            {
              "name": "Nimal Perera",
              "email": "duplicate@example.com",
              "phone": "0771234567",
              "password": "SecurePass123"
            }
            """;

        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void registerPharmacy_withValidData_returnsSuccessWithoutToken() throws Exception {
        String requestBody = """
            {
              "name": "City Pharmacy",
              "email": "city.pharmacy@example.com",
              "phone": "0112345678",
              "password": "SecurePass123",
              "licenceNo": "LIC-00123",
              "address": "123 Galle Road, Colombo"
            }
            """;

        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.token").doesNotExist());
    }
}
