package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PrescriptionRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.suwalink.repository.PharmacyRepository pharmacyRepository;

    @Test
    void create_asCustomer_returnsCreatedRequest() throws Exception {
        String token = registerCustomerAndLogin("presc.create@example.com");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .param("patientAge", "34")
                .param("note", "Doctor's handwriting is hard to read")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.patientAge").value(34))
            .andExpect(jsonPath("$.data.note").value("Doctor's handwriting is hard to read"))
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andExpect(jsonPath("$.data.imageUrl").isNotEmpty());
    }

    @Test
    void create_withoutImage_isRejected() throws Exception {
        String token = registerCustomerAndLogin("presc.noimage@example.com");

        mockMvc.perform(multipart("/api/prescriptions")
                .param("patientAge", "34")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_asPharmacy_isForbidden() throws Exception {
        String token = registerVerifiedPharmacyAndLogin("presc.pharmacy@example.com", "LIC-P-1");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .param("patientAge", "40")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void myRequests_returnsOnlyOwnRequests() throws Exception {
        String tokenA = registerCustomerAndLogin("presc.mine.a@example.com");
        String tokenB = registerCustomerAndLogin("presc.mine.b@example.com");

        createPrescription(tokenA, 25, "Request from A");
        createPrescription(tokenB, 50, "Request from B");

        mockMvc.perform(get("/api/prescriptions/me").header("Authorization", "Bearer " + tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].note").value("Request from A"));
    }

    @Test
    void getById_asOtherCustomer_isForbidden() throws Exception {
        String owner = registerCustomerAndLogin("presc.owner@example.com");
        String stranger = registerCustomerAndLogin("presc.stranger@example.com");

        String id = createPrescription(owner, 30, "Owner's request");

        mockMvc.perform(get("/api/prescriptions/" + id).header("Authorization", "Bearer " + stranger))
            .andExpect(status().isForbidden());
    }

    @Test
    void getById_asPharmacy_isAllowed() throws Exception {
        String owner = registerCustomerAndLogin("presc.owner2@example.com");
        String pharmacy = registerVerifiedPharmacyAndLogin("presc.viewer@example.com", "LIC-P-2");

        String id = createPrescription(owner, 30, "Visible to pharmacies");

        mockMvc.perform(get("/api/prescriptions/" + id).header("Authorization", "Bearer " + pharmacy))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.note").value("Visible to pharmacies"));
    }

    @Test
    void listPending_asPharmacy_includesSubmittedRequest() throws Exception {
        String owner = registerCustomerAndLogin("presc.pending.owner@example.com");
        String pharmacy = registerVerifiedPharmacyAndLogin("presc.pending.viewer@example.com", "LIC-P-3");

        createPrescription(owner, 60, "Needs review");

        mockMvc.perform(get("/api/prescriptions").header("Authorization", "Bearer " + pharmacy))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void update_byOwner_changesNoteAndAge() throws Exception {
        String token = registerCustomerAndLogin("presc.update@example.com");
        String id = createPrescription(token, 20, "Original note");

        mockMvc.perform(multipart(HttpMethod.PUT, "/api/prescriptions/" + id)
                .param("patientAge", "21")
                .param("note", "Updated note")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.patientAge").value(21))
            .andExpect(jsonPath("$.data.note").value("Updated note"));
    }

    @Test
    void update_byNonOwner_isForbidden() throws Exception {
        String owner = registerCustomerAndLogin("presc.update.owner@example.com");
        String stranger = registerCustomerAndLogin("presc.update.stranger@example.com");
        String id = createPrescription(owner, 20, "Original note");

        mockMvc.perform(multipart(HttpMethod.PUT, "/api/prescriptions/" + id)
                .param("patientAge", "99")
                .header("Authorization", "Bearer " + stranger))
            .andExpect(status().isForbidden());
    }

    @Test
    void delete_byOwner_removesRequest() throws Exception {
        String token = registerCustomerAndLogin("presc.delete@example.com");
        String id = createPrescription(token, 45, "To be deleted");

        mockMvc.perform(delete("/api/prescriptions/" + id).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/prescriptions/" + id).header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());
    }

    @Test
    void close_byOwner_setsStatusClosed() throws Exception {
        String token = registerCustomerAndLogin("presc.close@example.com");
        String id = createPrescription(token, 28, "To be closed");

        mockMvc.perform(patch("/api/prescriptions/" + id + "/close").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("CLOSED"));
    }

    @Test
    void close_byNonOwner_isForbidden() throws Exception {
        String owner = registerCustomerAndLogin("presc.close.owner@example.com");
        String stranger = registerCustomerAndLogin("presc.close.stranger@example.com");
        String id = createPrescription(owner, 28, "Owned by someone else");

        mockMvc.perform(patch("/api/prescriptions/" + id + "/close").header("Authorization", "Bearer " + stranger))
            .andExpect(status().isForbidden());
    }

    private MockMultipartFile samplePrescriptionImage() throws IOException {
        BufferedImage image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return new MockMultipartFile("image", "prescription.png", MediaType.IMAGE_PNG_VALUE, out.toByteArray());
    }

    private String createPrescription(String token, int age, String note) throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .param("patientAge", String.valueOf(age))
                .param("note", note)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isCreated())
            .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private String registerCustomerAndLogin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "name": "Test Customer", "email": "%s", "phone": "0771234567", "password": "SecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isCreated());

        return loginAndGetToken(email);
    }

    private String registerVerifiedPharmacyAndLogin(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "name": "Test Pharmacy", "email": "%s", "phone": "0112345678", "password": "SecurePass123", "licenceNo": "%s", "address": "123 Test Rd" }
                    """.formatted(email, licenceNo)))
            .andExpect(status().isCreated());

        verifyPharmacyViaAdminSql(email);
        return loginAndGetToken(email);
    }

    private void verifyPharmacyViaAdminSql(String email) {
        com.suwalink.entity.Pharmacy pharmacy = pharmacyRepository.findAll().stream()
            .filter(p -> p.getUser().getEmail().equals(email))
            .findFirst()
            .orElseThrow();
        pharmacy.setStatus(com.suwalink.entity.PharmacyStatus.VERIFIED);
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
