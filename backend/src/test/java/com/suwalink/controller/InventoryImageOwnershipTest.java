package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Category;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.UnitOfMeasure;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.PharmacyRepository;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
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

/**
 * Covers the inventory image-ownership check added here: an image uploaded by one pharmacy
 * could previously be reused by any other pharmacy on their own inventory listing, since Image
 * had no owner concept at all.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class InventoryImageOwnershipTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Autowired
    private ManufacturerRepository manufacturerRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private MedicineMasterRepository medicineMasterRepository;

    @Test
    void addInventoryItem_withOwnUploadedImage_succeeds() throws Exception {
        String pharmacyAToken = registerVerifiedPharmacyAndLogin("img.owner.a@example.com", "LIC-IMG-1");
        UUID imageId = uploadImage(pharmacyAToken);
        UUID medicineId = createMedicine();

        mockMvc.perform(post("/api/inventory")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + pharmacyAToken)
                .content("""
                    { "medicineMasterId": "%s", "unitPrice": 100.00, "stockQuantity": 10, "expireDate": "2030-01-01", "imageId": "%s" }
                    """.formatted(medicineId, imageId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void addInventoryItem_reusingAnotherPharmacysImage_isForbidden() throws Exception {
        String pharmacyAToken = registerVerifiedPharmacyAndLogin("img.owner.b@example.com", "LIC-IMG-2");
        UUID imageId = uploadImage(pharmacyAToken);

        String pharmacyBToken = registerVerifiedPharmacyAndLogin("img.thief.b@example.com", "LIC-IMG-3");
        UUID medicineId = createMedicine();

        mockMvc.perform(post("/api/inventory")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + pharmacyBToken)
                .content("""
                    { "medicineMasterId": "%s", "unitPrice": 100.00, "stockQuantity": 10, "expireDate": "2030-01-01", "imageId": "%s" }
                    """.formatted(medicineId, imageId)))
            .andExpect(status().isForbidden());
    }

    private UUID uploadImage(String token) throws Exception {
        BufferedImage image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        MockMultipartFile file = new MockMultipartFile("file", "medicine.png", MediaType.IMAGE_PNG_VALUE, out.toByteArray());

        MvcResult result = mockMvc.perform(multipart("/api/images")
                .file(file)
                .param("imageType", "INVENTORY")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isCreated())
            .andReturn();

        String id = JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        return UUID.fromString(id);
    }

    private UUID createMedicine() {
        Manufacturer manufacturer = manufacturerRepository.save(Manufacturer.builder()
            .name("Manufacturer-" + UUID.randomUUID())
            .country("Sri Lanka")
            .isActive(true)
            .build());

        Category category = categoryRepository.save(Category.builder()
            .name("Category-" + UUID.randomUUID())
            .active(true)
            .build());

        MedicineMaster medicine = medicineMasterRepository.save(MedicineMaster.builder()
            .brandName("Panadol")
            .genericName("Paracetamol")
            .dosageForm("Tablet")
            .strength("500mg")
            .unitOfMeasure(UnitOfMeasure.TABLET)
            .manufacturer(manufacturer)
            .therapeuticCategory(category)
            .legalCategory(PrescriptionStatus.OTC)
            .build());

        return medicine.getId();
    }

    private String registerVerifiedPharmacyAndLogin(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "name": "Image Test Pharmacy", "email": "%s", "phone": "0112345678", "password": "SecurePass123", "licenceNo": "%s", "address": "123 Test Rd" }
                    """.formatted(email, licenceNo)))
            .andExpect(status().isCreated());

        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
            .filter(p -> p.getUser().getEmail().equals(email))
            .findFirst()
            .orElseThrow();
        pharmacy.setStatus(PharmacyStatus.VERIFIED);
        pharmacyRepository.save(pharmacy);

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
