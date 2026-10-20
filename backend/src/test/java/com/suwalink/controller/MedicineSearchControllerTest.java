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
class MedicineSearchControllerTest {

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
    void searchGroupsOffersByMedicine() throws Exception {
        mockMvc.perform(get("/api/medicines/search").param("q", "panadol"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].pharmacyCount").value(2))
                .andExpect(jsonPath("$.data.content[0].lowestPrice").value(10.00))
                .andExpect(jsonPath("$.data.content[0].requiresPrescription").value(false));
    }

    @Test
    void searchHidesPendingDemoExpiredZeroStockAndUnavailable() throws Exception {
        mockMvc.perform(get("/api/medicines/search").param("q", "paracetamol"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].pharmacyCount").value(2))
                .andExpect(jsonPath("$.data.content[0].lowestPrice").value(10.00));
    }

    @Test
    void searchCountsAPharmacyOnceForTwoBatches() throws Exception {
        stock(kandy, "11.00", 3, LocalDate.now().plusYears(2), true);
        mockMvc.perform(get("/api/medicines/search").param("q", "panadol"))
                .andExpect(jsonPath("$.data.content[0].pharmacyCount").value(2));
    }

    @Test
    void searchWithLocationReportsNearestDistance() throws Exception {
        mockMvc.perform(get("/api/medicines/search").param("q", "panadol")
                        .param("lat", "7.2900").param("lng", "80.6300"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].nearestDistanceKm").isNumber())
                .andExpect(jsonPath("$.data.content[0].nearestDistanceKm", org.hamcrest.Matchers.lessThan(5.0)));
    }

    @Test
    void searchFiltersByDistrict() throws Exception {
        mockMvc.perform(get("/api/medicines/search").param("q", "panadol").param("district", "KANDY"))
                .andExpect(jsonPath("$.data.content[0].pharmacyCount").value(1));
    }

    @Test
    void searchWithNoMatchesReturnsEmptyPage() throws Exception {
        mockMvc.perform(get("/api/medicines/search").param("q", "zzz"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(0))
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    void searchIsPublic() throws Exception {
        mockMvc.perform(get("/api/medicines/search")).andExpect(status().isOk());
    }

    @Test
    void demoPharmacyAppearsWhenDemoModeOn() throws Exception {
        visibility.setDemoModePublic(true);
        mockMvc.perform(get("/api/medicines/search").param("q", "panadol"))
                .andExpect(jsonPath("$.data.content[0].pharmacyCount").value(3));
    }

    @Test
    void offersSortedByDistance() throws Exception {
        mockMvc.perform(get("/api/medicines/" + panadol.getId() + "/offers")
                        .param("lat", "7.2900").param("lng", "80.6300").param("sort", "distance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].pharmacy.city").value("Kandy"))
                .andExpect(jsonPath("$.data[0].distanceKm").isNumber());
    }

    @Test
    void offersSortedByPriceWithoutLocation() throws Exception {
        mockMvc.perform(get("/api/medicines/" + panadol.getId() + "/offers").param("sort", "distance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].unitPrice").value(10.00))
                .andExpect(jsonPath("$.data[0].distanceKm").doesNotExist());
    }

    @Test
    void medicineDetailReturns404ForUnknownId() throws Exception {
        mockMvc.perform(get("/api/medicines/" + UUID.randomUUID())).andExpect(status().isNotFound());
    }

    @Test
    void medicineDetailIsPublic() throws Exception {
        mockMvc.perform(get("/api/medicines/" + panadol.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.brandName").value("Panadol"));
    }

    @Test
    void oldInventorySearchAppliesOfferRule() throws Exception {
        mockMvc.perform(get("/api/inventory/search").param("query", "panadol"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void invalidDistrictReturns400() throws Exception {
        mockMvc.perform(get("/api/medicines/search").param("district", "LONDON"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid value for parameter 'district'"));
    }

    @Test
    void invalidLatitudeReturns400() throws Exception {
        mockMvc.perform(get("/api/medicines/search").param("lat", "abc").param("lng", "80"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void malformedMedicineIdReturns400() throws Exception {
        mockMvc.perform(get("/api/medicines/not-a-uuid")).andExpect(status().isBadRequest());
    }

    @Test
    void districtIsCaseInsensitive() throws Exception {
        mockMvc.perform(get("/api/medicines/search").param("q", "panadol").param("district", "kandy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].pharmacyCount").value(1));
    }

    @Test
    void districtWithSpaceIsAccepted() throws Exception {
        mockMvc.perform(get("/api/medicines/search").param("district", "Nuwara Eliya"))
                .andExpect(status().isOk());
    }

    @Test
    void equalDistanceResultsAreOrderedByBrandName() throws Exception {
        MedicineMaster aspirin = medicineMasterRepository.save(MedicineMaster.builder()
                .brandName("Aspirin").genericName("Acetylsalicylic acid").dosageForm("Tablet").strength("100mg")
                .unitOfMeasure(UnitOfMeasure.TABLET).manufacturer(panadol.getManufacturer())
                .therapeuticCategory(panadol.getTherapeuticCategory())
                .legalCategory(PrescriptionStatus.OTC).build());
        inventoryRepository.save(Inventory.builder()
                .medicineMaster(aspirin).pharmacy(colombo).unitPrice(new BigDecimal("4.00"))
                .currency(Currency.LKR).stockQuantity(5).expireDate(LocalDate.now().plusYears(1))
                .available(true).build());
        mockMvc.perform(get("/api/medicines/search")
                        .param("lat", "6.9271").param("lng", "79.8612"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].brandName").value("Aspirin"))
                .andExpect(jsonPath("$.data.content[1].brandName").value("Panadol"));
    }
}
