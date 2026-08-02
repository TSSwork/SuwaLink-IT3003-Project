package com.suwalink.IT3003.controller;

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
    public DashboardResponse getDashboard() {
        return adminService.getDashboard();
    }
    @GetMapping("/pharmacies")
    public List<PharmacyResponse> getAllPharmacies() {
        return adminService.getAllPharmacies();
    }
    @PutMapping("/pharmacies/{id}/approve")
    public ResponseEntity<String> approve(@PathVariable UUID id){

        adminService.approvePharmacy(id);

        return ResponseEntity.ok("Pharmacy Approved");
    }

    @PutMapping("/pharmacies/{id}/reject")
    public ResponseEntity<String> reject(@PathVariable UUID id){

        adminService.rejectPharmacy(id);

        return ResponseEntity.ok("Pharmacy Rejected");
    }

    @GetMapping("/users")
    public List<UserResponse> getUsers(){

        return adminService.getAllUsers();
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<String> delete(@PathVariable UUID id){

        adminService.deleteUser(id);

        return ResponseEntity.ok("User Deleted");
    }

}
