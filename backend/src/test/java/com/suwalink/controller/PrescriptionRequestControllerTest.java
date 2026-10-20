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
import static org.assertj.core.api.Assertions.assertThat;

import com.suwalink.entity.District;
import com.suwalink.entity.NotificationType;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.PrescriptionRequestService;
import com.suwalink.support.TestPayloads;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;
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

    @Autowired
    private PrescriptionRequestRepository prescriptionRequestRepository;

    @Autowired
    private PrescriptionRequestService prescriptionRequestService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    // --- Targeting: verified Colombo, Kandy and Galle pharmacies, plus a pending and a demo one ---

    private String colomboToken;
    private String kandyToken;

    private void seedPharmacies() throws Exception {
        colomboToken = registerPharmacy("tgt.colombo@example.com", "LIC-T-COL",
            District.COLOMBO, "6.927100", "79.861200", PharmacyStatus.VERIFIED, false);
        kandyToken = registerPharmacy("tgt.kandy@example.com", "LIC-T-KAN",
            District.KANDY, "7.290600", "80.633700", PharmacyStatus.VERIFIED, false);
        registerPharmacy("tgt.galle@example.com", "LIC-T-GAL",
            District.GALLE, "6.053500", "80.221000", PharmacyStatus.VERIFIED, false);
        registerPharmacy("tgt.pending@example.com", "LIC-T-PEN",
            District.COLOMBO, "6.927100", "79.861200", PharmacyStatus.PENDING, false);
        registerPharmacy("tgt.demo@example.com", "LIC-T-DEM",
            District.COLOMBO, "6.927100", "79.861200", PharmacyStatus.VERIFIED, true);
    }

    @Test
    void radiusScopeTargetsOnlyPharmaciesWithin10Km() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.radius@example.com");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(TestPayloads.prescriptionTargetRadius("6.930000", "79.860000"))
                .param("patientAge", "30")
                .header("Authorization", "Bearer " + customer))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.targetScope").value("RADIUS_10KM"))
            .andExpect(jsonPath("$.data.targetCount").value(1))
            .andExpect(jsonPath("$.data.expiresAt").isNotEmpty());

        mockMvc.perform(get("/api/prescriptions").header("Authorization", "Bearer " + colomboToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1));
        mockMvc.perform(get("/api/prescriptions").header("Authorization", "Bearer " + kandyToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void districtScopeTargetsDistrict() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.district@example.com");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(TestPayloads.prescriptionTargetDistrict("KANDY"))
                .param("patientAge", "30")
                .header("Authorization", "Bearer " + customer))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.targetScope").value("DISTRICT"))
            .andExpect(jsonPath("$.data.district").value("KANDY"))
            .andExpect(jsonPath("$.data.targetCount").value(1));
    }

    @Test
    void allScopeTargetsAllVisible() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.all@example.com");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(TestPayloads.prescriptionTargetAll())
                .param("patientAge", "30")
                .header("Authorization", "Bearer " + customer))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.targetScope").value("ALL"))
            .andExpect(jsonPath("$.data.targetCount").value(3));
    }

    @Test
    void radiusWithNoPharmacyReturns422AndSavesNothing() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.jaffna@example.com");
        long requestsBefore = prescriptionRequestRepository.count();
        long filesBefore = countUploadedFiles();

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(TestPayloads.prescriptionTargetRadius("9.660000", "80.020000"))
                .param("patientAge", "30")
                .header("Authorization", "Bearer " + customer))
            .andExpect(status().isUnprocessableContent())
            .andExpect(jsonPath("$.message").value(
                "No pharmacies within 10 km. Try 'My district' or 'All pharmacies'."));

        assertThat(prescriptionRequestRepository.count()).isEqualTo(requestsBefore);
        assertThat(countUploadedFiles()).isEqualTo(filesBefore);
    }

    @Test
    void radiusWithoutLocationIs400() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.noloc@example.com");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(TestPayloads.prescriptionTarget("targetScope", "RADIUS_10KM"))
                .param("patientAge", "30")
                .header("Authorization", "Bearer " + customer))
            .andExpect(status().isBadRequest());
    }

    @Test
    void districtWithoutDistrictIs400() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.nodistrict@example.com");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(TestPayloads.prescriptionTarget("targetScope", "DISTRICT"))
                .param("patientAge", "30")
                .header("Authorization", "Bearer " + customer))
            .andExpect(status().isBadRequest());
    }

    @Test
    void consentIsRequired() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.noconsent@example.com");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(TestPayloads.prescriptionTarget("targetScope", "ALL", "consent", "false"))
                .param("patientAge", "30")
                .header("Authorization", "Bearer " + customer))
            .andExpect(status().isBadRequest());
    }

    @Test
    void nonTargetedPharmacyCannotSeeRequest() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.private@example.com");
        String id = createPrescription(customer, 30, "Colombo only",
            TestPayloads.prescriptionTargetRadius("6.930000", "79.860000"));

        mockMvc.perform(get("/api/prescriptions/" + id).header("Authorization", "Bearer " + kandyToken))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/prescriptions").header("Authorization", "Bearer " + kandyToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(0));
        mockMvc.perform(get("/api/prescriptions/" + id).header("Authorization", "Bearer " + colomboToken))
            .andExpect(status().isOk());
    }

    @Test
    void adminCanReadAnyRequest() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.admin@example.com");
        String id = createPrescription(customer, 30, "Admin may read");
        String admin = loginAndGetToken("bootstrap.admin@suwalink.local", "test-admin-password");

        mockMvc.perform(get("/api/prescriptions/" + id).header("Authorization", "Bearer " + admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.note").value("Admin may read"));
    }

    @Test
    void onlyTargetedPharmaciesAreNotified() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.notify@example.com");
        createPrescription(customer, 30, "Notify Colombo",
            TestPayloads.prescriptionTargetRadius("6.930000", "79.860000"));

        assertThat(prescriptionNotificationCount("tgt.colombo@example.com")).isEqualTo(1);
        assertThat(prescriptionNotificationCount("tgt.kandy@example.com")).isZero();
        assertThat(prescriptionNotificationCount("tgt.galle@example.com")).isZero();
        assertThat(prescriptionNotificationCount("tgt.pending@example.com")).isZero();
        assertThat(prescriptionNotificationCount("tgt.demo@example.com")).isZero();
    }

    @Test
    void expireOverdueMarksOpenRequestsExpired() throws Exception {
        seedPharmacies();
        String customer = registerCustomerAndLogin("tgt.expire@example.com");
        String id = createPrescription(customer, 30, "Will expire",
            TestPayloads.prescriptionTargetRadius("6.930000", "79.860000"));
        createPrescription(customer, 30, "Still fresh",
            TestPayloads.prescriptionTargetRadius("6.930000", "79.860000"));

        PrescriptionRequest overdue = prescriptionRequestRepository.findById(UUID.fromString(id)).orElseThrow();
        overdue.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        prescriptionRequestRepository.saveAndFlush(overdue);

        assertThat(prescriptionRequestService.expireOverdue(LocalDateTime.now())).isEqualTo(1);
        assertThat(prescriptionRequestRepository.findById(UUID.fromString(id)).orElseThrow().getStatus())
            .isEqualTo(PrescriptionRequestStatus.EXPIRED);

        mockMvc.perform(get("/api/prescriptions").header("Authorization", "Bearer " + colomboToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].note").value("Still fresh"));
    }

    private long prescriptionNotificationCount(String email) {
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(
                userRepository.findByEmail(email).orElseThrow()).stream()
            .filter(n -> n.getType() == NotificationType.PRESCRIPTION)
            .count();
    }

    private long countUploadedFiles() throws IOException {
        Path dir = Path.of(uploadDir);
        if (!Files.isDirectory(dir)) {
            return 0;
        }
        try (Stream<Path> files = Files.list(dir)) {
            return files.count();
        }
    }

    private String registerPharmacy(String email, String licenceNo, District district, String lat, String lng,
            PharmacyStatus status, boolean demo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
            .andExpect(status().isCreated());

        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
            .filter(p -> p.getUser().getEmail().equals(email))
            .findFirst()
            .orElseThrow();
        pharmacy.setDistrict(district);
        pharmacy.setLatitude(new BigDecimal(lat));
        pharmacy.setLongitude(new BigDecimal(lng));
        pharmacy.setStatus(status);
        pharmacy.setDemo(demo);
        pharmacyRepository.save(pharmacy);
        return status == PharmacyStatus.VERIFIED && !demo ? loginAndGetToken(email) : null;
    }

    @Test
    void create_asCustomer_returnsCreatedRequest() throws Exception {
        registerVerifiedPharmacyAndLogin("presc.recipient0@example.com", "LIC-P-R0");
        String token = registerCustomerAndLogin("presc.create@example.com");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(TestPayloads.prescriptionTargetAll())
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
                .with(TestPayloads.prescriptionTargetAll())
                .param("patientAge", "34")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_asPharmacy_isForbidden() throws Exception {
        String token = registerVerifiedPharmacyAndLogin("presc.pharmacy@example.com", "LIC-P-1");

        mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(TestPayloads.prescriptionTargetAll())
                .param("patientAge", "40")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void myRequests_returnsOnlyOwnRequests() throws Exception {
        registerVerifiedPharmacyAndLogin("presc.recipient1@example.com", "LIC-P-R1");
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
        registerVerifiedPharmacyAndLogin("presc.recipient2@example.com", "LIC-P-R2");
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
    void list_asTargetedPharmacy_includesSubmittedRequest() throws Exception {
        String owner = registerCustomerAndLogin("presc.pending.owner@example.com");
        String pharmacy = registerVerifiedPharmacyAndLogin("presc.pending.viewer@example.com", "LIC-P-3");

        createPrescription(owner, 60, "Needs review");

        mockMvc.perform(get("/api/prescriptions").header("Authorization", "Bearer " + pharmacy))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].note").value("Needs review"));
    }

    @Test
    void update_byOwner_changesNoteAndAge() throws Exception {
        registerVerifiedPharmacyAndLogin("presc.recipient3@example.com", "LIC-P-R3");
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
        registerVerifiedPharmacyAndLogin("presc.recipient4@example.com", "LIC-P-R4");
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
        registerVerifiedPharmacyAndLogin("presc.recipient5@example.com", "LIC-P-R5");
        String token = registerCustomerAndLogin("presc.delete@example.com");
        String id = createPrescription(token, 45, "To be deleted");

        mockMvc.perform(delete("/api/prescriptions/" + id).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/prescriptions/" + id).header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());
    }

    @Test
    void close_byOwner_setsStatusClosed() throws Exception {
        registerVerifiedPharmacyAndLogin("presc.recipient6@example.com", "LIC-P-R6");
        String token = registerCustomerAndLogin("presc.close@example.com");
        String id = createPrescription(token, 28, "To be closed");

        mockMvc.perform(patch("/api/prescriptions/" + id + "/close").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("CLOSED"));
    }

    @Test
    void close_byNonOwner_isForbidden() throws Exception {
        registerVerifiedPharmacyAndLogin("presc.recipient7@example.com", "LIC-P-R7");
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
        return createPrescription(token, age, note, TestPayloads.prescriptionTargetAll());
    }

    private String createPrescription(String token, int age, String note, RequestPostProcessor target)
            throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/prescriptions")
                .file(samplePrescriptionImage())
                .with(target)
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
                .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
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
