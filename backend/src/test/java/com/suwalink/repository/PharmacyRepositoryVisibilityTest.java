package com.suwalink.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.suwalink.entity.District;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PharmacyRepositoryVisibilityTest {

    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private UserRepository userRepository;

    private Pharmacy colombo;
    private Pharmacy kandy;

    @BeforeEach
    void seed() {
        colombo = pharmacy("Colombo Verified", District.COLOMBO, "6.927100", "79.861200", PharmacyStatus.VERIFIED, false);
        kandy = pharmacy("Kandy Verified", District.KANDY, "7.290600", "80.633700", PharmacyStatus.VERIFIED, false);
        pharmacy("Colombo Pending", District.COLOMBO, "6.930000", "79.860000", PharmacyStatus.PENDING, false);
        pharmacy("Colombo Demo", District.COLOMBO, "6.920000", "79.850000", PharmacyStatus.VERIFIED, true);
    }

    private Pharmacy pharmacy(String name, District district, String lat, String lng,
                              PharmacyStatus status, boolean isDemo) {
        User user = userRepository.save(User.builder().termsAcceptedAt(java.time.LocalDateTime.now())
                .name(name).email(name.replace(' ', '.').toLowerCase() + "@example.com").phone("0771234567")
                .password("x").role(Role.PHARMACY_OWNER).build());
        return pharmacyRepository.save(Pharmacy.builder()
                .name(name).phone("0112345678").address(name + " Road").district(district).city(district.name())
                .latitude(new BigDecimal(lat)).longitude(new BigDecimal(lng))
                .licenceNo("LIC-" + UUID.randomUUID()).status(status).demo(isDemo).user(user).build());
    }

    @Test
    void findVisibleExcludesPendingAndDemoWhenDemoOff() {
        assertThat(pharmacyRepository.findVisible(false)).containsExactlyInAnyOrder(colombo, kandy);
    }

    @Test
    void findVisibleIncludesDemoWhenDemoOn() {
        assertThat(pharmacyRepository.findVisible(true)).hasSize(3);
    }

    @Test
    void findVisibleByDistrictFilters() {
        assertThat(pharmacyRepository.findVisibleByDistrict(District.COLOMBO, false)).containsExactly(colombo);
    }

    @Test
    void findVisibleInBoxFilters() {
        assertThat(pharmacyRepository.findVisibleInBox(
                new BigDecimal("6.8"), new BigDecimal("7.0"),
                new BigDecimal("79.7"), new BigDecimal("80.0"), false)).containsExactly(colombo);
    }
}
