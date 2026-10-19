package com.suwalink.service;

import com.suwalink.dto.response.DashboardResponse;
import com.suwalink.dto.response.PharmacyResponse;
import com.suwalink.dto.response.UserResponse;

import java.util.List;
import java.util.UUID;

public interface AdminService {
    DashboardResponse getDashboard();
    List<PharmacyResponse> getAllPharmacies();
    void approvePharmacy(UUID pharmacyId);
    void rejectPharmacy(UUID pharmacyId);

    List<UserResponse> getAllUsers();

    void deleteUser(UUID id);
}
