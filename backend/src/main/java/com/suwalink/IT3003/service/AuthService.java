package com.suwalink.IT3003.service;

import com.suwalink.IT3003.dto.request.CustomerRegisterRequest;
import com.suwalink.IT3003.dto.request.LoginRequest;
import com.suwalink.IT3003.dto.request.PharmacyRegisterRequest;
import com.suwalink.IT3003.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse registerCustomer(CustomerRegisterRequest request);

    void registerPharmacy(PharmacyRegisterRequest request);

    AuthResponse login(LoginRequest request);
}
