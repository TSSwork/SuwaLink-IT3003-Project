package com.suwalink.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.suwalink.entity.AppSetting;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.User;
import com.suwalink.repository.AppSettingRepository;
import com.suwalink.service.impl.PharmacyVisibilityServiceImpl;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PharmacyVisibilityServiceImplTest {

    private final AppSettingRepository repo = mock(AppSettingRepository.class);
    private final PharmacyVisibilityServiceImpl service = new PharmacyVisibilityServiceImpl(repo);

    private void demoMode(String value) {
        when(repo.findById("demo_mode_public")).thenReturn(Optional.of(new AppSetting("demo_mode_public", value, null)));
    }

    private Pharmacy pharmacy(PharmacyStatus status, boolean demo) {
        return Pharmacy.builder().status(status).demo(demo).user(User.builder().build()).build();
    }

    @Test
    void suspendedOrDeletedOwnersPharmacyIsNotVisible() {
        demoMode("true");
        Pharmacy suspended = pharmacy(PharmacyStatus.VERIFIED, false);
        suspended.getUser().setSuspended(true);
        assertThat(service.isPubliclyVisible(suspended)).isFalse();
        Pharmacy deleted = pharmacy(PharmacyStatus.VERIFIED, false);
        deleted.getUser().setDeletedAt(LocalDateTime.now());
        assertThat(service.isPubliclyVisible(deleted)).isFalse();
    }

    @Test
    void verifiedRealPharmacyIsVisible() {
        demoMode("false");
        assertThat(service.isPubliclyVisible(pharmacy(PharmacyStatus.VERIFIED, false))).isTrue();
    }

    @Test
    void pendingPharmacyIsNotVisible() {
        demoMode("true");
        assertThat(service.isPubliclyVisible(pharmacy(PharmacyStatus.PENDING, false))).isFalse();
        assertThat(service.isPubliclyVisible(pharmacy(PharmacyStatus.REJECTED, false))).isFalse();
    }

    @Test
    void demoPharmacyVisibleOnlyWhenDemoModeOn() {
        demoMode("false");
        assertThat(service.isPubliclyVisible(pharmacy(PharmacyStatus.VERIFIED, true))).isFalse();
        demoMode("true");
        assertThat(service.isPubliclyVisible(pharmacy(PharmacyStatus.VERIFIED, true))).isTrue();
        assertThat(service.includeDemo()).isTrue();
    }

    @Test
    void missingSettingMeansDemoModeOff() {
        when(repo.findById("demo_mode_public")).thenReturn(Optional.empty());
        assertThat(service.isDemoModePublic()).isFalse();
        assertThat(service.isPubliclyVisible(pharmacy(PharmacyStatus.VERIFIED, true))).isFalse();
    }
}
