package com.suwalink.IT3003.service.impl;

import com.suwalink.IT3003.dto.request.CustomerRegisterRequest;
import com.suwalink.IT3003.dto.request.ForgotPasswordRequest;
import com.suwalink.IT3003.dto.request.LoginRequest;
import com.suwalink.IT3003.dto.request.PharmacyRegisterRequest;
import com.suwalink.IT3003.dto.request.ResetPasswordRequest;
import com.suwalink.IT3003.dto.response.AuthResponse;
import com.suwalink.IT3003.entity.Pharmacy;
import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.exception.DuplicateResourceException;
import com.suwalink.IT3003.exception.EmailAlreadyExistsException;
import com.suwalink.IT3003.exception.InvalidOtpException;
import com.suwalink.IT3003.exception.PharmacyNotVerifiedException;
import com.suwalink.IT3003.exception.ResourceNotFoundException;
import com.suwalink.IT3003.repository.PharmacyRepository;
import com.suwalink.IT3003.repository.UserRepository;
import com.suwalink.IT3003.security.JwtService;
import com.suwalink.IT3003.service.AuthService;
import com.suwalink.IT3003.service.MailService;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PharmacyRepository pharmacyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final MailService mailService;

    @Value("${app.otp.expiry-minutes}")
    private int otpExpiryMinutes;

    @Override
    @Transactional
    public AuthResponse registerCustomer(CustomerRegisterRequest request) {
        User saved = registerUser(
            request.getName(), request.getEmail(), request.getPhone(), request.getPassword(), Role.CUSTOMER);

        String token = jwtService.generateToken(saved.getId(), saved.getEmail(), saved.getRole());

        return AuthResponse.builder()
            .token(token)
            .role(saved.getRole())
            .id(saved.getId())
            .name(saved.getName())
            .build();
    }

    @Override
    @Transactional
    public void registerPharmacy(PharmacyRegisterRequest request) {
        if (pharmacyRepository.existsByLicenceNo(request.getLicenceNo())) {
            throw new DuplicateResourceException(
                "A pharmacy with licence number '" + request.getLicenceNo() + "' already exists");
        }

        User savedUser = registerUser(
            request.getName(), request.getEmail(), request.getPhone(), request.getPassword(), Role.PHARMACY_ADMIN);

        Pharmacy pharmacy = Pharmacy.builder()
            .licenceNo(request.getLicenceNo())
            .address(request.getAddress())
            .verified(false)
            .user(savedUser)
            .build();

        pharmacyRepository.save(pharmacy);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (user.getRole() == Role.PHARMACY_ADMIN) {
            Pharmacy pharmacy = pharmacyRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalStateException("Pharmacy admin missing pharmacy record"));
            if (!pharmacy.isVerified()) {
                throw new PharmacyNotVerifiedException();
            }
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());

        return AuthResponse.builder()
            .token(token)
            .role(user.getRole())
            .id(user.getId())
            .name(user.getName())
            .build();
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new ResourceNotFoundException("No account found with that email"));

        String otp = generateOtp();
        user.setResetOtp(otp);
        user.setResetOtpExpiry(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        userRepository.save(user);

        mailService.sendPasswordResetOtp(user.getEmail(), otp);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new ResourceNotFoundException("No account found with that email"));

        if (user.getResetOtp() == null || user.getResetOtpExpiry() == null) {
            throw new InvalidOtpException("No password reset was requested for this account");
        }
        if (LocalDateTime.now().isAfter(user.getResetOtpExpiry())) {
            throw new InvalidOtpException("This code has expired. Please request a new one");
        }
        if (!user.getResetOtp().equals(request.getOtp())) {
            throw new InvalidOtpException("Invalid code");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);
        userRepository.save(user);
    }

    private String generateOtp() {
        int otp = 100000 + RANDOM.nextInt(900000);
        return String.valueOf(otp);
    }

    private User registerUser(String name, String email, String phone, String rawPassword, Role role) {
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        User user = User.builder()
            .name(name)
            .email(email)
            .phone(phone)
            .password(passwordEncoder.encode(rawPassword))
            .role(role)
            .build();

        return userRepository.save(user);
    }
}
