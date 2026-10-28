package com.suwalink.controller;

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
import java.util.UUID;
import com.suwalink.support.TestPayloads;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** A pharmacy stocks each catalogue medicine once; it edits that line instead of adding another. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class InventoryDuplicateTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private MedicineMasterRepository medicineMasterRepository;

    @Test
    void addingAMedicineThePharmacyAlreadyStocksIsRejectedAsDuplicate() throws Exception {
        String token = registerVerifiedPharmacyAndLogin("dup.owner.a@example.com", "LIC-DUP-1");
        UUID medicineId = createMedicine();

        add(token, medicineId).andExpect(status().isCreated());
        add(token, medicineId)
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("DUPLICATE"));
    }

    @Test
    void anotherPharmacyCanStockTheSameMedicine() throws Exception {
        String first = registerVerifiedPharmacyAndLogin("dup.owner.b@example.com", "LIC-DUP-2");
        String second = registerVerifiedPharmacyAndLogin("dup.owner.c@example.com", "LIC-DUP-3");
        UUID medicineId = createMedicine();

        add(first, medicineId).andExpect(status().isCreated());
        add(second, medicineId).andExpect(status().isCreated());
    }

    private ResultActions add(String token, UUID medicineId) throws Exception {
        return mockMvc.perform(post("/api/inventory")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + token)
                .content("""
                    { "medicineMasterId": "%s", "unitPrice": 100.00, "stockQuantity": 10, "expireDate": "2030-01-01" }
                    """.formatted(medicineId)));
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
                .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
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
