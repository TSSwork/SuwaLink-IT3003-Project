package com.suwalink.service.impl;

import com.suwalink.entity.District;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.TargetScope;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.service.PharmacyVisibilityService;
import com.suwalink.service.PrescriptionTargetingService;
import com.suwalink.util.GeoUtils;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PrescriptionTargetingServiceImpl implements PrescriptionTargetingService {

    static final double RADIUS_KM = 10.0;
    private static final double KM_PER_DEGREE = 111.0;

    private final PharmacyRepository pharmacyRepository;
    private final PharmacyVisibilityService visibilityService;

    @Override
    @Transactional(readOnly = true)
    public List<Pharmacy> findTargets(TargetScope scope, BigDecimal lat, BigDecimal lng, District district) {
        boolean includeDemo = visibilityService.includeDemo();
        return switch (scope) {
            case RADIUS_10KM -> withinRadius(lat.doubleValue(), lng.doubleValue(), includeDemo);
            case DISTRICT -> pharmacyRepository.findVisibleByDistrict(district, includeDemo);
            case ALL -> pharmacyRepository.findVisible(includeDemo);
        };
    }

    private List<Pharmacy> withinRadius(double lat, double lng, boolean includeDemo) {
        double latDelta = RADIUS_KM / KM_PER_DEGREE;
        double lngDelta = RADIUS_KM / (KM_PER_DEGREE * Math.cos(Math.toRadians(lat)));
        return pharmacyRepository.findVisibleInBox(
                BigDecimal.valueOf(lat - latDelta), BigDecimal.valueOf(lat + latDelta),
                BigDecimal.valueOf(lng - lngDelta), BigDecimal.valueOf(lng + lngDelta),
                includeDemo).stream()
            .filter(p -> GeoUtils.haversineKm(lat, lng,
                p.getLatitude().doubleValue(), p.getLongitude().doubleValue()) <= RADIUS_KM)
            .toList();
    }
}
