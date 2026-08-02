package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.DashboardResponse;
import com.suwalink.IT3003.dto.response.PharmacyResponse;
import com.suwalink.IT3003.dto.response.UserResponse;
import com.suwalink.IT3003.service.AdminService;
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

    @DeleteMapping("/pharmacies/{id}")
    public ResponseEntity<ApiResponse<Void>> reject(@PathVariable UUID id) {
        adminService.rejectPharmacy(id);
        return ResponseEntity.ok(ApiResponse.success("Pharmacy application rejected"));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsers() {
        return ResponseEntity.ok(ApiResponse.success("Users", adminService.getAllUsers()));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deleted"));
    }

}
