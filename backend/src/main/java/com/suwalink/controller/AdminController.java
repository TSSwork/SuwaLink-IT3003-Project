package com.suwalink.controller;

import com.suwalink.dto.request.UpdateAppSettingsRequest;
import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.AppSettingsResponse;
import com.suwalink.dto.response.DashboardResponse;
import com.suwalink.dto.response.PharmacyResponse;
import com.suwalink.dto.response.UserResponse;
import com.suwalink.entity.AccountStatus;
import com.suwalink.service.AccountService;
import com.suwalink.service.AdminService;
import com.suwalink.service.PharmacyVisibilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AdminService adminService;
    private final AccountService accountService;
    private final PharmacyVisibilityService visibility;

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<AppSettingsResponse>> getSettings() {
        return ResponseEntity.ok(ApiResponse.success("Settings",
            new AppSettingsResponse(visibility.isDemoModePublic())));
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<AppSettingsResponse>> updateSettings(
            @Valid @RequestBody UpdateAppSettingsRequest request) {
        visibility.setDemoModePublic(request.getDemoModePublic());
        return ResponseEntity.ok(ApiResponse.success("Settings updated",
            new AppSettingsResponse(visibility.isDemoModePublic())));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.success("Dashboard stats", adminService.getDashboard()));
    }

    @GetMapping("/pharmacies")
    public ResponseEntity<ApiResponse<List<PharmacyResponse>>> getAllPharmacies() {
        return ResponseEntity.ok(ApiResponse.success("Pharmacies", adminService.getAllPharmacies()));
    }

    @PutMapping("/pharmacies/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approve(@PathVariable UUID id) {
        adminService.approvePharmacy(id);
        return ResponseEntity.ok(ApiResponse.success("Pharmacy approved"));
    }

    @PutMapping("/pharmacies/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> reject(@PathVariable UUID id) {
        adminService.rejectPharmacy(id);
        return ResponseEntity.ok(ApiResponse.success("Pharmacy application rejected"));
    }

    /** {@code status} omitted lists every account that isn't deleted. */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) AccountStatus status) {
        return ResponseEntity.ok(ApiResponse.success("Users", adminService.getUsers(q, status)));
    }

    @PutMapping("/users/{id}/suspend")
    public ResponseEntity<ApiResponse<Void>> suspend(@PathVariable UUID id) {
        accountService.suspend(id);
        return ResponseEntity.ok(ApiResponse.success("User suspended"));
    }

    @PutMapping("/users/{id}/reactivate")
    public ResponseEntity<ApiResponse<Void>> reactivate(@PathVariable UUID id) {
        accountService.reactivate(id);
        return ResponseEntity.ok(ApiResponse.success("User reactivated"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        accountService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deleted"));
    }

}
