package com.suwalink.controller;

import com.suwalink.entity.District;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.support.TestPayloads;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
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

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PharmacyRepository pharmacyRepository;

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
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration("city.pharmacy@example.com", "LIC-00123")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.token").doesNotExist());
    }

    @Test
    void pharmacyRegistrationCreatesPharmacyOwnerRole() throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration("owner.role@example.com", "LIC-00456")))
            .andExpect(status().isCreated());

        User saved = userRepository.findByEmail("owner.role@example.com").orElseThrow();
        assertThat(saved.getRole()).isEqualTo(Role.PHARMACY_OWNER);
    }

    @Test
    void pharmacyRegistrationStoresProfileAndLocation() throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration("loc@example.com", "LIC-LOC-1")))
            .andExpect(status().isCreated());

        User owner = userRepository.findByEmail("loc@example.com").orElseThrow();
        Pharmacy pharmacy = pharmacyRepository.findByUserId(owner.getId()).orElseThrow();
        assertThat(pharmacy.getName()).isEqualTo("Test Pharmacy");
        assertThat(pharmacy.getDistrict()).isEqualTo(District.COLOMBO);
        assertThat(pharmacy.getCity()).isEqualTo("Colombo");
        assertThat(pharmacy.getLatitude()).isEqualByComparingTo("6.927100");
        assertThat(pharmacy.getLongitude()).isEqualByComparingTo("79.861200");
        assertThat(pharmacy.getPhone()).isEqualTo("0112345678");
        assertThat(pharmacy.isDemo()).isFalse();
        assertThat(pharmacy.getStatus()).isEqualTo(PharmacyStatus.PENDING);
    }

    @Test
    void pharmacyRegistrationRejectsCoordinatesOutsideSriLanka() throws Exception {
        String body = TestPayloads.pharmacyRegistration("far@example.com", "LIC-FAR-1")
            .replace("\"latitude\": 6.927100", "\"latitude\": 51.5");
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void pharmacyRegistrationRejectsUnknownDistrict() throws Exception {
        String body = TestPayloads.pharmacyRegistration("lon@example.com", "LIC-LON-1")
            .replace("\"COLOMBO\"", "\"LONDON\"");
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void pharmacyRegistrationRequiresPharmacyName() throws Exception {
        String body = TestPayloads.pharmacyRegistration("nn@example.com", "LIC-NN-1")
            .replace("\"pharmacyName\": \"Test Pharmacy\",", "");
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
    }
}
