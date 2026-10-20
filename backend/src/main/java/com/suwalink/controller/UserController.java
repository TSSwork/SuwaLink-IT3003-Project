package com.suwalink.controller;

import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.UserProfileResponse;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.dto.request.UpdatePreferencesRequest;
import com.suwalink.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final CurrentUserProvider currentUserProvider;
    private final PharmacyRepository pharmacyRepository;
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>>
    me() {
        User user = currentUserProvider.getCurrentUser();

        UserProfileResponse.UserProfileResponseBuilder profile = UserProfileResponse.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .phone(user.getPhone())
            .role(user.getRole())
            .preferredLanguage(user.getPreferredLanguage())
            .district(user.getDistrict());

        if (user.getRole() == Role.PHARMACY_OWNER) {
            pharmacyRepository.findByUserId(user.getId())
                .map(this::toPharmacyInfo)
                .ifPresent(profile::pharmacy);
        }

        return ResponseEntity.ok(ApiResponse.success("Current user profile", profile.build()));
    }

    @PutMapping("/me/preferences")
    public ResponseEntity<ApiResponse<Void>> updatePreferences(@Valid @RequestBody UpdatePreferencesRequest request) {
        userService.updatePreferences(currentUserProvider.getCurrentUser(), request);
        return ResponseEntity.ok(ApiResponse.success("Preferences updated"));
    }

    private UserProfileResponse.PharmacyInfo
    toPharmacyInfo(Pharmacy pharmacy) {
        return UserProfileResponse.PharmacyInfo.builder()
            .id(pharmacy.getId())
            .licenceNo(pharmacy.getLicenceNo())
            .address(pharmacy.getAddress())
            .status(pharmacy.getStatus().name())
            .build();
    }
}
