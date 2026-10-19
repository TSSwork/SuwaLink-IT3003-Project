package com.suwalink.service;

import com.suwalink.dto.request.CustomerRegisterRequest;
import com.suwalink.dto.request.ForgotPasswordRequest;
import com.suwalink.dto.request.LoginRequest;
import com.suwalink.dto.request.PharmacyRegisterRequest;
import com.suwalink.dto.request.ResetPasswordRequest;
import com.suwalink.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse registerCustomer(CustomerRegisterRequest request);

    void registerPharmacy(PharmacyRegisterRequest request);

    AuthResponse login(LoginRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    void resetPassword(ResetPasswordRequest request);
}
