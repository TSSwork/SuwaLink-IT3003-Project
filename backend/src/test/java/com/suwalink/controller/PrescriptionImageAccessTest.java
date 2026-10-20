package com.suwalink.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Image;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.repository.ImageRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.support.TestPayloads;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
class PrescriptionImageAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Autowired
    private ImageRepository imageRepository;

    private String ownerToken;
    private String imageId;
    private String imageUrl;

    private void givenPrescriptionWithTargetedPharmacy(String suffix) throws Exception {
        ownerToken = registerCustomerAndLogin("pimg.owner." + suffix + "@example.com");
        registerPharmacyAndLogin("pimg.targeted." + suffix + "@example.com", "LIC-PI-T-" + suffix);
        MvcResult result = mockMvc.perform(multipart("/api/prescriptions")
                        .file(sampleImage("image"))
                        .with(TestPayloads.prescriptionTargetAll())
                        .param("patientAge", "30")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        imageId = JsonPath.read(body, "$.data.imageId");
        imageUrl = JsonPath.read(body, "$.data.imageUrl");
    }

    @Test
    void ownerCanFetchPrescriptionImage() throws Exception {
        givenPrescriptionWithTargetedPharmacy("a");
        mockMvc.perform(get(imageUrl).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/webp"))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    @Test
    void targetedPharmacyCanFetchImage() throws Exception {
        givenPrescriptionWithTargetedPharmacy("b");
        String token = loginAndGetToken("pimg.targeted.b@example.com");
        mockMvc.perform(get(imageUrl).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void nonTargetedPharmacyGets403() throws Exception {
        givenPrescriptionWithTargetedPharmacy("c");
        String token = registerPharmacyAndLogin("pimg.other.c@example.com", "LIC-PI-O-c");
        mockMvc.perform(get(imageUrl).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void otherCustomerGets403() throws Exception {
        givenPrescriptionWithTargetedPharmacy("d");
        String token = registerCustomerAndLogin("pimg.stranger.d@example.com");
        mockMvc.perform(get(imageUrl).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousGets401() throws Exception {
        givenPrescriptionWithTargetedPharmacy("e");
        mockMvc.perform(get(imageUrl)).andExpect(status().isUnauthorized());
    }

    @Test
    void staticUploadsPathIsGone() throws Exception {
        givenPrescriptionWithTargetedPharmacy("f");
        Image image = imageRepository.findById(UUID.fromString(imageId)).orElseThrow();
        int status = mockMvc.perform(get("/uploads/" + image.getGeneratedFilename()))
                .andReturn().getResponse().getStatus();
        assertThat(status).isIn(401, 404);
    }

    @Test
    void publicEndpointRefusesPrescriptionImages() throws Exception {
        givenPrescriptionWithTargetedPharmacy("g");
        Image image = imageRepository.findById(UUID.fromString(imageId)).orElseThrow();
        mockMvc.perform(get("/api/images/public/" + image.getGeneratedFilename()))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicInventoryImageIsServed() throws Exception {
        String token = registerPharmacyAndLogin("pimg.inv@example.com", "LIC-PI-INV");
        MvcResult result = mockMvc.perform(multipart("/api/images")
                        .file(sampleImage("file"))
                        .param("imageType", "INVENTORY")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn();
        String url = JsonPath.read(result.getResponse().getContentAsString(), "$.data.url");
        assertThat(url).startsWith("/api/images/public/");
        mockMvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("public")));
    }

    @Test
    void genericUploadRejectsPrescriptionType() throws Exception {
        String token = registerCustomerAndLogin("pimg.generic@example.com");
        mockMvc.perform(multipart("/api/images")
                        .file(sampleImage("file"))
                        .param("imageType", "PRESCRIPTION")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    private MockMultipartFile sampleImage(String partName) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", out);
        return new MockMultipartFile(partName, "scan.png", MediaType.IMAGE_PNG_VALUE, out.toByteArray());
    }

    private String registerCustomerAndLogin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestPayloads.customerRegistration(email)))
                .andExpect(status().isCreated());
        return loginAndGetToken(email);
    }

    private String registerPharmacyAndLogin(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
                .andExpect(status().isCreated());
        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
                .filter(p -> p.getUser().getEmail().equals(email))
                .findFirst().orElseThrow();
        pharmacy.setStatus(PharmacyStatus.VERIFIED);
        pharmacyRepository.save(pharmacy);
        return loginAndGetToken(email);
    }

    private String loginAndGetToken(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"email\": \"" + email + "\", \"password\": \"SecurePass123\" }"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.token");
    }
}
