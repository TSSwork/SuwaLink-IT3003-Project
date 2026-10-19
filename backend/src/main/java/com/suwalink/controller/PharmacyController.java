package com.suwalink.controller;

import com.suwalink.dto.request.UpdatePharmacyProfileRequest;
import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.PharmacyProfileResponse;
import com.suwalink.service.PharmacyProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pharmacies")
@RequiredArgsConstructor
public class PharmacyController {

    private final PharmacyProfileService pharmacyProfileService;

    @GetMapping("/me")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<PharmacyProfileResponse>> getMyProfile() {
        return ResponseEntity.ok(ApiResponse.success("Pharmacy profile", pharmacyProfileService.getMyProfile()));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<PharmacyProfileResponse>> updateMyProfile(
            @Valid @RequestBody UpdatePharmacyProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Pharmacy profile updated",
            pharmacyProfileService.updateMyProfile(request)));
    }
}
