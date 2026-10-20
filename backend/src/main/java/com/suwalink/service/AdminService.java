package com.suwalink.service;

import com.suwalink.dto.response.DashboardResponse;
import com.suwalink.dto.response.PharmacyResponse;
import com.suwalink.dto.response.UserResponse;
import com.suwalink.entity.AccountStatus;

import java.util.List;
import java.util.UUID;

public interface AdminService {
    DashboardResponse getDashboard();
    List<PharmacyResponse> getAllPharmacies();
    void approvePharmacy(UUID pharmacyId);
    void rejectPharmacy(UUID pharmacyId);

    /**
     * Users matching {@code q} (name or email, optional) in the given status; a null status means
     * every account that isn't deleted.
     */
    List<UserResponse> getUsers(String q, AccountStatus status);
}
