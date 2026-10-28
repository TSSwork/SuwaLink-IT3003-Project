package com.suwalink.repository;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.suwalink.entity.Category;
import com.suwalink.entity.District;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.UnitOfMeasure;
import com.suwalink.entity.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/** The database itself refuses a second stock line for the same pharmacy and medicine. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class InventoryUniqueMedicineTest {

    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private MedicineMasterRepository medicineMasterRepository;

    @Test
    void secondRowForSamePharmacyAndMedicineIsRejected() {
        Pharmacy pharmacy = pharmacy();
        MedicineMaster medicine = medicine();
        inventoryRepository.saveAndFlush(line(pharmacy, medicine));

        assertThatThrownBy(() -> inventoryRepository.saveAndFlush(line(pharmacy, medicine)))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Inventory line(Pharmacy pharmacy, MedicineMaster medicine) {
        return Inventory.builder()
            .pharmacy(pharmacy).medicineMaster(medicine)
            .unitPrice(new BigDecimal("100.00")).stockQuantity(10)
            .expireDate(LocalDate.of(2030, 1, 1))
            .build();
    }

    private Pharmacy pharmacy() {
        User user = userRepository.save(User.builder().termsAcceptedAt(LocalDateTime.now())
            .name("Unique Owner").email("unique.owner@example.com").phone("0771234567")
            .password("x").role(Role.PHARMACY_OWNER).build());
        return pharmacyRepository.save(Pharmacy.builder()
            .name("Unique Pharmacy").phone("0112345678").address("1 Unique Road")
            .district(District.COLOMBO).city("Colombo")
            .latitude(new BigDecimal("6.927100")).longitude(new BigDecimal("79.861200"))
            .licenceNo("LIC-" + UUID.randomUUID()).status(PharmacyStatus.VERIFIED).user(user).build());
    }

    private MedicineMaster medicine() {
        Manufacturer manufacturer = manufacturerRepository.save(Manufacturer.builder()
            .name("Manufacturer-" + UUID.randomUUID()).country("Sri Lanka").isActive(true).build());
        Category category = categoryRepository.save(Category.builder()
            .name("Category-" + UUID.randomUUID()).active(true).build());
        return medicineMasterRepository.save(MedicineMaster.builder()
            .brandName("Panadol").genericName("Paracetamol").dosageForm("Tablet").strength("500mg")
            .unitOfMeasure(UnitOfMeasure.TABLET).manufacturer(manufacturer)
            .therapeuticCategory(category).legalCategory(PrescriptionStatus.OTC).build());
    }
}
