package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.suwalink.entity.Category;
import com.suwalink.entity.Currency;
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
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.PharmacyVisibilityService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PharmacyPublicControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private MedicineMasterRepository medicineMasterRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private PharmacyVisibilityService visibility;

    private Pharmacy colombo;
    private Pharmacy kandy;
    private Pharmacy pending;
    private Pharmacy demo;
    private MedicineMaster panadol;

    @BeforeEach
    void seed() {
        visibility.setDemoModePublic(false);
        colombo = pharmacy("Colombo Care", District.COLOMBO, "Colombo", "6.927100", "79.861200", PharmacyStatus.VERIFIED, false);
        kandy = pharmacy("Kandy Care", District.KANDY, "Kandy", "7.290600", "80.633700", PharmacyStatus.VERIFIED, false);
        pending = pharmacy("Pending Pharm", District.COLOMBO, "Colombo", "6.930000", "79.860000", PharmacyStatus.PENDING, false);
        demo = pharmacy("Demo Pharm", District.GALLE, "Galle", "6.032900", "80.217000", PharmacyStatus.VERIFIED, true);

        Manufacturer manufacturer = manufacturerRepository.save(Manufacturer.builder()
                .name("Acme-" + UUID.randomUUID()).country("Sri Lanka").isActive(true).build());
        Category category = categoryRepository.save(Category.builder()
                .name("Cat-" + UUID.randomUUID()).active(true).build());
        panadol = medicineMasterRepository.save(MedicineMaster.builder()
                .brandName("Panadol").genericName("Paracetamol").dosageForm("Tablet").strength("500mg")
                .unitOfMeasure(UnitOfMeasure.TABLET).manufacturer(manufacturer).therapeuticCategory(category)
                .legalCategory(PrescriptionStatus.OTC).build());

        LocalDate future = LocalDate.now().plusYears(1);
        stock(colombo, "12.00", 10, future, true);
        stock(kandy, "10.00", 5, future, true);
        // rows that must never appear as offers
        stock(colombo, "9.00", 5, LocalDate.now().minusDays(1), true); // expired
        stock(colombo, "8.00", 0, future, true);                       // zero stock
        stock(colombo, "7.00", 5, future, false);                      // unavailable
        stock(pending, "5.00", 5, future, true);
        stock(demo, "6.00", 5, future, true);
    }

    private Pharmacy pharmacy(String name, District district, String city, String lat, String lng,
                              PharmacyStatus status, boolean isDemo) {
        User user = userRepository.save(User.builder()
                .name(name).email(name.replace(' ', '.').toLowerCase() + "@example.com").phone("0771234567")
                .password("x").role(Role.PHARMACY_OWNER).build());
        return pharmacyRepository.save(Pharmacy.builder()
                .name(name).phone("0112345678").address(name + " Road").district(district).city(city)
                .latitude(new BigDecimal(lat)).longitude(new BigDecimal(lng))
                .licenceNo("LIC-" + UUID.randomUUID()).status(status).demo(isDemo).user(user).build());
    }

    private Inventory stock(Pharmacy pharmacy, String price, int qty, LocalDate expiry, boolean available) {
        return inventoryRepository.save(Inventory.builder()
                .medicineMaster(panadol).pharmacy(pharmacy).unitPrice(new BigDecimal(price))
                .currency(Currency.LKR).stockQuantity(qty).expireDate(expiry).available(available).build());
    }

    @Test
    void publicPageShowsProfileAndOffers() throws Exception {
        mockMvc.perform(get("/api/pharmacies/" + colombo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Colombo Care"))
                .andExpect(jsonPath("$.data.district").value("COLOMBO"))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].brandName").value("Panadol"))
                .andExpect(jsonPath("$.data.items[0].requiresPrescription").value(false))
                .andExpect(jsonPath("$.data.items[0].unitPrice").value(12.00));
    }

    @Test
    void pendingPharmacyIs404() throws Exception {
        mockMvc.perform(get("/api/pharmacies/" + pending.getId())).andExpect(status().isNotFound());
    }

    @Test
    void rejectedPharmacyIs404() throws Exception {
        pending.setStatus(PharmacyStatus.REJECTED);
        pharmacyRepository.save(pending);
        mockMvc.perform(get("/api/pharmacies/" + pending.getId())).andExpect(status().isNotFound());
    }

    @Test
    void demoPharmacyIs404WhenDemoModeOff() throws Exception {
        mockMvc.perform(get("/api/pharmacies/" + demo.getId())).andExpect(status().isNotFound());
        visibility.setDemoModePublic(true);
        mockMvc.perform(get("/api/pharmacies/" + demo.getId())).andExpect(status().isOk());
    }

    @Test
    void unknownIdIs404() throws Exception {
        mockMvc.perform(get("/api/pharmacies/" + UUID.randomUUID())).andExpect(status().isNotFound());
    }

    @Test
    void meStillRequiresOwnerRole() throws Exception {
        mockMvc.perform(get("/api/pharmacies/me")).andExpect(status().isUnauthorized());
    }
}
