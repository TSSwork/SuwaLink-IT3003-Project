package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class PharmacyProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Test
    void ownerReadsOwnProfile() throws Exception {
        String token = registerVerifiedOwnerAndLogin("profile.read@example.com", "LIC-PROF-1");

        mockMvc.perform(get("/api/pharmacies/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Test Pharmacy"))
            .andExpect(jsonPath("$.data.district").value("COLOMBO"))
            .andExpect(jsonPath("$.data.ownerEmail").value("profile.read@example.com"))
            .andExpect(jsonPath("$.data.ownerName").value("Test Owner"))
            .andExpect(jsonPath("$.data.licenceNo").value("LIC-PROF-1"))
            .andExpect(jsonPath("$.data.status").value("VERIFIED"));
    }

    @Test
    void ownerUpdatesLocationAndHours() throws Exception {
        String token = registerVerifiedOwnerAndLogin("profile.update@example.com", "LIC-PROF-2");

        mockMvc.perform(put("/api/pharmacies/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updatePayload("100")))
            .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/pharmacies/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updatePayload("80.633700")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.district").value("KANDY"));

        mockMvc.perform(get("/api/pharmacies/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.district").value("KANDY"))
            .andExpect(jsonPath("$.data.city").value("Kandy"))
            .andExpect(jsonPath("$.data.latitude").value(7.2906))
            .andExpect(jsonPath("$.data.longitude").value(80.6337))
            .andExpect(jsonPath("$.data.openingHours").value("8am-9pm"))
            .andExpect(jsonPath("$.data.name").value("Kandy Pharmacy"));
    }

    @Test
    void updateRejectsInvalidCoordinates() throws Exception {
        String token = registerVerifiedOwnerAndLogin("profile.invalid@example.com", "LIC-PROF-3");

        mockMvc.perform(put("/api/pharmacies/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updatePayload("100")))
            .andExpect(status().isBadRequest());
    }

    @Test
    void customerCannotReadPharmacyProfile() throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.customerRegistration("profile.customer@example.com")))
            .andExpect(status().isCreated());
        String token = login("profile.customer@example.com");

        mockMvc.perform(get("/api/pharmacies/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    private String updatePayload(String longitude) {
        return """
            {
              "name": "Kandy Pharmacy",
              "phone": "0812223334",
              "address": "5 Temple St",
              "district": "KANDY",
              "city": "Kandy",
              "latitude": 7.290600,
              "longitude": %s,
              "openingHours": "8am-9pm"
            }
            """.formatted(longitude);
    }

    private String registerVerifiedOwnerAndLogin(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
            .andExpect(status().isCreated());
        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
            .filter(p -> p.getUser().getEmail().equals(email))
            .findFirst().orElseThrow();
        pharmacy.setStatus(PharmacyStatus.VERIFIED);
        pharmacyRepository.saveAndFlush(pharmacy);
        return login(email);
    }

    private String login(String email) throws Exception {
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
