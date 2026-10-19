package com.suwalink.service.impl;

import com.suwalink.dto.request.UpdatePharmacyProfileRequest;
import com.suwalink.dto.response.PharmacyProfileResponse;
import com.suwalink.entity.Pharmacy;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.PharmacyProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PharmacyProfileServiceImpl implements PharmacyProfileService {

    private final PharmacyRepository pharmacyRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PharmacyProfileResponse getMyProfile() {
        return toResponse(currentPharmacy());
    }

    @Override
    @Transactional
    public PharmacyProfileResponse updateMyProfile(UpdatePharmacyProfileRequest request) {
        Pharmacy pharmacy = currentPharmacy();
        pharmacy.setName(request.getName());
        pharmacy.setPhone(request.getPhone());
        pharmacy.setAddress(request.getAddress());
        pharmacy.setDistrict(request.getDistrict());
        pharmacy.setCity(request.getCity());
        pharmacy.setLatitude(request.getLatitude());
        pharmacy.setLongitude(request.getLongitude());
        pharmacy.setOpeningHours(request.getOpeningHours());
        return toResponse(pharmacyRepository.save(pharmacy));
    }

    private Pharmacy currentPharmacy() {
        return pharmacyRepository.findByUserId(currentUserProvider.getCurrentUser().getId())
            .orElseThrow(() -> new IllegalStateException("Pharmacy admin missing pharmacy record"));
    }

    private PharmacyProfileResponse toResponse(Pharmacy pharmacy) {
        return PharmacyProfileResponse.builder()
            .id(pharmacy.getId())
            .name(pharmacy.getName())
            .phone(pharmacy.getPhone())
            .address(pharmacy.getAddress())
            .district(pharmacy.getDistrict())
            .city(pharmacy.getCity())
            .latitude(pharmacy.getLatitude())
            .longitude(pharmacy.getLongitude())
            .openingHours(pharmacy.getOpeningHours())
            .licenceNo(pharmacy.getLicenceNo())
            .status(pharmacy.getStatus())
            .ownerName(pharmacy.getUser().getName())
            .ownerEmail(pharmacy.getUser().getEmail())
            .build();
    }
}
