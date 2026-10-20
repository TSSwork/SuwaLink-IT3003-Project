package com.suwalink.service;

import com.suwalink.entity.District;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.TargetScope;
import java.math.BigDecimal;
import java.util.List;

/** Decides which publicly visible pharmacies receive a prescription request. */
public interface PrescriptionTargetingService {

    /**
     * Publicly visible pharmacies matching the scope: within 10 km of {@code lat}/{@code lng}
     * ({@link TargetScope#RADIUS_10KM}), in {@code district} ({@link TargetScope#DISTRICT}), or all
     * ({@link TargetScope#ALL}). Arguments a scope does not use may be null.
     */
    List<Pharmacy> findTargets(TargetScope scope, BigDecimal lat, BigDecimal lng, District district);
}
