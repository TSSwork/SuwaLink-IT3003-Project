package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.UserProfileResponse;
import com.suwalink.IT3003.entity.Pharmacy;
import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.repository.PharmacyRepository;
import com.suwalink.IT3003.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final CurrentUserProvider currentUserProvider;
    private final PharmacyRepository pharmacyRepository;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> me() {
        User user = currentUserProvider.getCurrentUser();

        UserProfileResponse.UserProfileResponseBuilder profile = UserProfileResponse.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .phone(user.getPhone())
            .role(user.getRole());

        if (user.getRole() == Role.PHARMACY_ADMIN) {
            pharmacyRepository.findByUserId(user.getId())
                .map(this::toPharmacyInfo)
                .ifPresent(profile::pharmacy);
        }

        return ResponseEntity.ok(ApiResponse.success("Current user profile", profile.build()));
    }

    private UserProfileResponse.PharmacyInfo toPharmacyInfo(Pharmacy pharmacy) {
        return UserProfileResponse.PharmacyInfo.builder()
            .id(pharmacy.getId())
            .licenceNo(pharmacy.getLicenceNo())
            .address(pharmacy.getAddress())
            .verified(pharmacy.isVerified())
            .build();
    }
}
