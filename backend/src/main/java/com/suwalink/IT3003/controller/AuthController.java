package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.request.CustomerRegisterRequest;
import com.suwalink.IT3003.dto.request.ForgotPasswordRequest;
import com.suwalink.IT3003.dto.request.LoginRequest;
import com.suwalink.IT3003.dto.request.PharmacyRegisterRequest;
import com.suwalink.IT3003.dto.request.ResetPasswordRequest;
import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.AuthResponse;
import com.suwalink.IT3003.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/customer")
    public ResponseEntity<ApiResponse<AuthResponse>>
    registerCustomer(@Valid @RequestBody CustomerRegisterRequest request) {
        AuthResponse response = authService.registerCustomer(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Registration successful", response));
    }

    @PostMapping("/register/pharmacy")
    public ResponseEntity<ApiResponse<Void>>
    registerPharmacy(@Valid @RequestBody PharmacyRegisterRequest request) {
        authService.registerPharmacy(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Registered. Awaiting verification."));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>>
    login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>>
    forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("A password reset code has been sent to your email"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>>
    resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful"));
    }
}
