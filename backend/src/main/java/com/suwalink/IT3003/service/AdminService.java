package com.suwalink.IT3003.service;

import com.suwalink.IT3003.dto.response.DashboardResponse;
import com.suwalink.IT3003.dto.response.PharmacyResponse;
import com.suwalink.IT3003.dto.response.UserResponse;

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
