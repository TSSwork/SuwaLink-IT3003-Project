package com.suwalink.controller;

import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.AppSettingsResponse;
import com.suwalink.service.PharmacyVisibilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class PublicSettingsController {

    private final PharmacyVisibilityService visibility;

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<AppSettingsResponse>> getPublicSettings() {
        return ResponseEntity.ok(ApiResponse.success("Public settings",
            new AppSettingsResponse(visibility.isDemoModePublic())));
    }
}
