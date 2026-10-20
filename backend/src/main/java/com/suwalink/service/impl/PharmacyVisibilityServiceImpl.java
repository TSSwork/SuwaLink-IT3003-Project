package com.suwalink.service.impl;

import com.suwalink.entity.AppSetting;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.repository.AppSettingRepository;
import com.suwalink.service.PharmacyVisibilityService;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PharmacyVisibilityServiceImpl implements PharmacyVisibilityService {

    static final String DEMO_MODE_KEY = "demo_mode_public";

    private final AppSettingRepository settings;

    @Override
    @Transactional(readOnly = true)
    public boolean isDemoModePublic() {
        return settings.findById(DEMO_MODE_KEY)
            .map(s -> Boolean.parseBoolean(s.getValue()))
            .orElse(false);
    }

    @Override
    @Transactional
    public void setDemoModePublic(boolean value) {
        AppSetting setting = settings.findById(DEMO_MODE_KEY)
            .orElseGet(() -> new AppSetting(DEMO_MODE_KEY, "false", null));
        setting.setValue(Boolean.toString(value));
        setting.setUpdatedAt(LocalDateTime.now());
        settings.save(setting);
    }

    @Override
    public boolean includeDemo() {
        return isDemoModePublic();
    }

    @Override
    public boolean isPubliclyVisible(Pharmacy pharmacy) {
        return pharmacy.getStatus() == PharmacyStatus.VERIFIED
            && !pharmacy.getUser().isSuspended()
            && pharmacy.getUser().getDeletedAt() == null
            && (!pharmacy.isDemo() || isDemoModePublic());
    }
}
